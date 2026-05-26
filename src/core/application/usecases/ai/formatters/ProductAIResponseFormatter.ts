import type { AIResultFormatter } from '@/core/application/usecases/ai/types';
import type {
  CreateProductAIResult,
  DeleteProductAIResult,
  GetProductAIResult,
  ProductCollectionAIResult,
  StockAIResult,
  UpdateProductAIResult,
} from '@/core/application/usecases/ai/product/ProductAIResultTypes';
import { PRODUCT_AI_ACTION } from '@/core/domain/constants/ProductConstants';
import { AI_RESPONSE_ICON } from '@/infra/ai/constants';

export class ProductAIResponseFormatter implements AIResultFormatter {
  supportsAction(action: string) {
    return Object.values(PRODUCT_AI_ACTION).includes(action as (typeof PRODUCT_AI_ACTION)[keyof typeof PRODUCT_AI_ACTION]);
  }

  async format(action: string, result: unknown) {
    if (action === PRODUCT_AI_ACTION.CREATE) {
      const createResult = result as CreateProductAIResult;
      return `${AI_RESPONSE_ICON.SUCCESS} Producto creado exitosamente:\n• SKU: ${createResult.product.sku}\n• Nombre: ${createResult.product.name}\n• Categoría: ${createResult.product.category}\n• Unidad: ${createResult.product.unit}\n• Stock mínimo: ${createResult.product.minStock}\n• Punto de reorden: ${createResult.product.reorderPoint}`;
    }

    if (action === PRODUCT_AI_ACTION.UPDATE) {
      const updateResult = result as UpdateProductAIResult;
      return `${AI_RESPONSE_ICON.SUCCESS} Producto ${updateResult.product.sku} actualizado correctamente.`;
    }

    if (action === PRODUCT_AI_ACTION.DELETE) {
      const deleteResult = result as DeleteProductAIResult;
      if (deleteResult.requiresConfirmation && deleteResult.confirmation) {
        return `Necesito confirmar antes de eliminar ${deleteResult.confirmation.sku} (${deleteResult.confirmation.productName}). Responde "sí" para confirmar o "no" para cancelar.`;
      }

      return AI_RESPONSE_ICON.SUCCESS;
    }

    if (action === PRODUCT_AI_ACTION.GET) {
      const getResult = result as GetProductAIResult;
      return `${AI_RESPONSE_ICON.PRODUCT} ${getResult.product.name}\n• SKU: ${getResult.product.sku}\n• Categoría: ${getResult.product.category}\n• Unidad: ${getResult.product.unit}\n• Stock mínimo: ${getResult.product.minStock}\n• Punto de reorden: ${getResult.product.reorderPoint}`;
    }

    if (action === PRODUCT_AI_ACTION.LIST) {
      const listResult = result as ProductCollectionAIResult;
      const productList = listResult.products
        .map((product) => `  • ${product.sku} - ${product.name} (${product.category})`)
        .join('\n');
      return `${AI_RESPONSE_ICON.PRODUCT} Encontrados ${listResult.total} productos:\n${productList}`;
    }

    if (action === PRODUCT_AI_ACTION.CHECK_STOCK) {
      const stockResult = result as StockAIResult;
      const statusIcon = stockResult.isLowStock ? AI_RESPONSE_ICON.WARNING : AI_RESPONSE_ICON.SUCCESS;
      return `${statusIcon} ${stockResult.product.name}\n• SKU: ${stockResult.product.sku}\n• Stock actual: ${stockResult.currentStock} unidades\n• Punto de reorden: ${stockResult.reorderPoint}\n• Estado: ${stockResult.isLowStock ? 'Stock bajo - Requiere reposición' : 'Stock suficiente'}`;
    }

    if (action === PRODUCT_AI_ACTION.SEARCH_BY_NAME) {
      const searchResult = result as ProductCollectionAIResult;
      if (searchResult.total === 0) {
        return `${AI_RESPONSE_ICON.SEARCH} No se encontraron productos que coincidan con la búsqueda.`;
      }

      const productList = searchResult.products
        .map((product) => `  • ${product.sku} - ${product.name} (${product.category})`)
        .join('\n');
      return `${AI_RESPONSE_ICON.SEARCH} Encontrados ${searchResult.total} productos:\n${productList}`;
    }

    if (action === PRODUCT_AI_ACTION.GET_LOW_STOCK) {
      const lowStockResult = result as ProductCollectionAIResult;
      if (lowStockResult.total === 0) {
        return `${AI_RESPONSE_ICON.SUCCESS} Todos los productos tienen stock suficiente.`;
      }

      const productList = lowStockResult.products
        .map((product) => `  • ${product.sku} - ${product.name}: ${product.currentStock} unidades (falta ${product.deficit})`)
        .join('\n');
      return `${AI_RESPONSE_ICON.WARNING} Productos con stock bajo (${lowStockResult.total}):\n${productList}`;
    }

    return AI_RESPONSE_ICON.SUCCESS;
  }
}