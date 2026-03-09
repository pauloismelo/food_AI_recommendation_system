import { View } from './View.js';

export class TFVisorView extends View {
    #logs = [];
    #lossPoints = [];
    #accPoints = [];
    #isVisOpen = false;
    constructor() {
        super();
    }

    resetDashboard() {
        this.#logs = [];
        this.#lossPoints = [];
        this.#accPoints = [];
    }

    handleTrainingLog(log) {
        if (!this.#isVisOpen) {
            tfvis.visor().open();
            this.#isVisOpen = true;
        }

        const { epoch, loss, accuracy } = log;
        this.#lossPoints.push({ x: epoch, y: loss });
        this.#accPoints.push({ x: epoch, y: accuracy });
        this.#logs.push(log);

        tfvis.render.linechart(
            {
                name: 'Model Accuracy',
                tab: 'Training',
                style: { display: 'inline-block', width: '49%' }
            },
            { values: this.#accPoints, series: ['accuracy'] },
            {
                xLabel: 'Epoch (Training Cycles)',
                yLabel: 'Accuracy (%)',
                height: 300
            }
        );

        tfvis.render.linechart(
            {
                name: 'Training Loss',
                tab: 'Training',
                style: { display: 'inline-block', width: '49%' }
            },
            { values: this.#lossPoints, series: ['loss'] },
            {
                xLabel: 'Epoch (Training Cycles)',
                yLabel: 'Loss Value',
                height: 300
            }
        );

    }

}
