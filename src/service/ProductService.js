export class ProductService {
    async getProducts() {
        const response = await fetch('/api/products');
        return await response.json();
    }

    async getProductById(id) {
        const response = await fetch(`/api/products/${id}`);
        return await response.json();
    }

    async getProductsByIds(ids) {
        const products = await this.getProducts();
        return products.filter(product => ids.includes(product.id));
    }
}
