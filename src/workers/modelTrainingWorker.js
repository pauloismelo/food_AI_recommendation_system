import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';
let _globalCtx = {};
let _model = null

const WEIGHTS = {
    category: 0.35,
    cuisine: 0.25,
    price: 0.15,
    age: 0.10,
    region: 0.15,
};


// 🔢 Normalize continuous values (price, age) to 0–1 range
// Why? Keeps all features balanced so no one dominates training
// Formula: (val - min) / (max - min)
// Example: price=129.99, minPrice=39.99, maxPrice=199.99 → 0.56
const normalize = (value, min, max) => (value - min) / ((max - min) || 1)

function makeContext(products, users) {
    const ages = users.map(u => u.age)
    const prices = products.map(p => p.price)

    const minAge = Math.min(...ages)
    const maxAge = Math.max(...ages)

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    const cuisines = [...new Set(products.map(p => p.cuisine))]
    const categories = [...new Set(products.map(p => p.category))]
    const regions = [...new Set(users.map(u => u.region))]

    const cuisinesIndex = Object.fromEntries(
        cuisines.map((cuisine, index) => {
            return [cuisine, index]
        }))
    const categoriesIndex = Object.fromEntries(
        categories.map((category, index) => {
            return [category, index]
        }))
    const regionsIndex = Object.fromEntries(
        regions.map((region, index) => {
            return [region, index]
        }))

    // Average age of users who bought each product (ajuda a personalizar)
    const midAge = (minAge + maxAge) / 2
    const ageSums = {}
    const ageCounts = {}

    users.forEach(user => {
        user.purchases.forEach(p => {
            ageSums[p.name] = (ageSums[p.name] || 0) + user.age //calculate the total age for each product
            ageCounts[p.name] = (ageCounts[p.name] || 0) + 1 //calculate the total count for each product
        })
    })

    const productAvgAgeNorm = Object.fromEntries(
        products.map(product => {
            const avg = ageCounts[product.name] ?
                ageSums[product.name] / ageCounts[product.name] :
                midAge

            return [product.name, normalize(avg, minAge, maxAge)]
        })
    )

    return {
        products,
        users,
        cuisinesIndex,
        categoriesIndex,
        regionsIndex,
        productAvgAgeNorm,
        minAge,
        maxAge,
        minPrice,
        maxPrice,
        numCategories: categories.length,
        numCuisines: cuisines.length,
        numRegions: regions.length,
        // price + age + cuisines + categories (product features)
        // region is a user-only feature, added separately in encodeUser
        productDimentions: 2 + categories.length + cuisines.length,
        // price + age + cuisines + categories + region (user features)
        userDimentions: 2 + categories.length + cuisines.length + regions.length
    }
}

const oneHotWeighted = (index, length, weight) =>
    tf.oneHot(index, length).cast('float32').mul(weight)

function encodeProduct(product, context) {
    // normalizing data to 0-1 range and
    // applying weight in recommendation importance
    const price = tf.tensor1d([
        normalize(
            product.price,
            context.minPrice,
            context.maxPrice
        ) * WEIGHTS.price
    ])

    const age = tf.tensor1d([
        (
            context.productAvgAgeNorm[product.name] ?? 0.5
        ) * WEIGHTS.age
    ])

    const category = oneHotWeighted(
        context.categoriesIndex[product.category],
        context.numCategories,
        WEIGHTS.category
    )

    const cuisine = oneHotWeighted(
        context.cuisinesIndex[product.cuisine],
        context.numCuisines,
        WEIGHTS.cuisine
    )

    return tf.concat1d(
        [price, age, category, cuisine]
    )
}

function encodeUser(user, context) {
    // Region one-hot encoding (user-only feature)
    const region = oneHotWeighted(
        context.regionsIndex[user.region],
        context.numRegions,
        WEIGHTS.region
    )

    if (user.purchases.length) {
        // Encode user as the mean of their purchased product vectors,
        // then append the region vector
        const purchaseVector = tf.stack(
            user.purchases.map(
                product => encodeProduct(product, context)
            )
        ).mean(0)

        return tf.concat1d(
            [purchaseVector, region]
        ).reshape([1, context.userDimentions])
    }

    return tf.concat1d(
        [
            tf.zeros([1]), // price is ignored,
            tf.tensor1d([
                normalize(user.age, context.minAge, context.maxAge)
                * WEIGHTS.age
            ]),
            tf.zeros([context.numCategories]), // category ignored,
            tf.zeros([context.numCuisines]), // cuisine ignored,
            region, // region is always included
        ]
    ).reshape([1, context.userDimentions])
}

function createTrainingData(context) {
    const inputs = []
    const labels = []
    context.users
        .filter(u => u.purchases.length)
        .forEach(user => {
            const userVector = encodeUser(user, context).dataSync()
            context.products.forEach(product => {
                const productVector = encodeProduct(product, context).dataSync()

                const label = user.purchases.some(
                    purchase => purchase.name === product.name ?
                        1 :
                        0
                )

                inputs.push([...userVector, ...productVector])
                labels.push(label)

            })
        })

    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimention: context.userDimentions + context.productDimentions
        // size = userVector (with region) + productVector
    }
}


// ====================================================================
    // 🧠 Neural network configuration and training
// ====================================================================
async function configureNeuralNetAndTrain(trainData) {

    const model = tf.sequential()
    // input layer + hidden layer 1
    // - inputShape: Number of features per training example (trainData.inputDim)
    //   Example: If the product + user vector = 20 numbers, then inputDim = 20
    // - units: 128 neurons (many "eyes" to detect patterns)
    // - activation: 'relu' (keeps only positive signals, helps learn non-linear patterns)
    model.add(
        tf.layers.dense({
            inputShape: [trainData.inputDimention],
            units: 128,
            activation: 'relu'
        })
    )
    // Hidden layer 1
    // - 64 neurons (less than the first layer: starts to compress information)
    // - activation: 'relu' (still extracting relevant feature combinations)
    model.add(
        tf.layers.dense({
            units: 64,
            activation: 'relu'
        })
    )

    // Hidden layer 2
    // - 32 neurons (narrower again, distilling the most important information)
    //   Example: From many signals, keeps only the strongest patterns
    // - activation: 'relu'
    model.add(
        tf.layers.dense({
            units: 32,
            activation: 'relu'
        })
    )
    // Output layer
    // - 1 neuron because we only want to return a recommendation score
    // - activation: 'sigmoid' compresses the result to the range 0–1
    //   Example: 0.9 = strong recommendation, 0.1 = weak recommendation
    model.add(
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
    )

    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
    })

    await model.fit(trainData.xs, trainData.ys, {
        epochs: 100,
        batchSize: 32,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                postMessage({
                    type: workerEvents.trainingLog,
                    epoch: epoch,
                    loss: logs.loss,
                    accuracy: logs.acc
                });
            }
        }
    })

    return model
}
async function trainModel({ users }) {
    console.log('Training model with users:', users);
    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 1 } });
    const products = await (await fetch('/api/products')).json()

    const context = makeContext(products, users)
    context.productVectors = products.map(product => {
        return {
            name: product.name,
            meta: { ...product },
            vector: encodeProduct(product, context).dataSync()
        }
    })

    _globalCtx = context

    const trainData = createTrainingData(context)
    _model = await configureNeuralNetAndTrain(trainData)

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });
}
function recommend({ user }) {
    if (!_model) return;
    const context = _globalCtx
    // 1️⃣ Convert the provided user into a vector of encoded features
    //    (price ignored, age normalized, categories ignored)
    //    This transforms the user's information into the same numerical format
    //    that was used to train the model.

    const userVector = encodeUser(user, context).dataSync()

    // 2️⃣ Create input pairs: for each product, concatenate the user vector
    //    with the encoded product vector.
    //    Why? The model predicts the "compatibility score" for each pair (user, product).

    const inputs = context.productVectors.map(({ vector }) => {
        return [...userVector, ...vector]
    })

    // 3️⃣ Convert all these pairs (user, product) into a single Tensor.
    //    Format: [numProducts, inputDim]
    const inputTensor = tf.tensor2d(inputs)

    // 4️⃣ Run the trained neural network on all (user, product) pairs at once.
    //    The result is a score for each product between 0 and 1.
    //    The higher the score, the more likely the user wants that product.
    const predictions = _model.predict(inputTensor)

    // 5️⃣ Extract the scores into a normal JS array.
    const scores = predictions.dataSync()
    const recommendations = context.productVectors.map((item, index) => {
        return {
            ...item.meta,
            name: item.name,
            score: scores[index] // model's prediction for this product
        }
    })

    const sortedItems = recommendations
        .sort((a, b) => b.score - a.score)

    // 8️⃣ Send the sorted list of recommended products
    //    to the main thread (the UI can display them now).
    postMessage({
        type: workerEvents.recommend,
        user,
        recommendations: sortedItems
    });

}
const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.recommend]: recommend,
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
