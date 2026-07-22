import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ExternalLink, Loader2 } from 'lucide-react';

export default function AmazonAffiliateManager() {
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['affiliate-products'],
    queryFn: () => base44.entities.AffiliateProduct.list('-sort_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AffiliateProduct.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-products'] });
      setIsDialogOpen(false);
      setEditingProduct(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AffiliateProduct.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-products'] });
      setIsDialogOpen(false);
      setEditingProduct(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AffiliateProduct.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-products'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      amazon_link: formData.get('amazon_link'),
      image_url: formData.get('image_url'),
      price: parseFloat(formData.get('price')),
      is_active: formData.get('is_active') === 'on',
      is_featured: formData.get('is_featured') === 'on',
      sort_order: parseInt(formData.get('sort_order') || '0'),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Affiliate Links</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage affiliate products displayed in the Device Shop
          </p>
        </div>
        <Button onClick={() => {
          setEditingProduct(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id} className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {product.image_url && (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{product.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{product.category}</Badge>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.is_featured && <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>}
                        {!product.is_active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(product.amazon_link, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input
                name="name"
                defaultValue={editingProduct?.name}
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                name="description"
                defaultValue={editingProduct?.description}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select name="category" defaultValue={editingProduct?.category || 'terminals'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terminals">Terminals</SelectItem>
                    <SelectItem value="card_readers">Card Readers</SelectItem>
                    <SelectItem value="printers">Printers</SelectItem>
                    <SelectItem value="scanners">Scanners</SelectItem>
                    <SelectItem value="tablets">Tablets</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="supplies">Supplies</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Price</Label>
                <Input
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={editingProduct?.price}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Affiliate Link</Label>
              <Input
                name="amazon_link"
                type="url"
                defaultValue={editingProduct?.amazon_link}
                placeholder="https://amazon.com/..."
                required
              />
            </div>

            <div>
              <Label>Image URL</Label>
              <Input
                name="image_url"
                type="url"
                defaultValue={editingProduct?.image_url}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sort Order</Label>
                <Input
                  name="sort_order"
                  type="number"
                  defaultValue={editingProduct?.sort_order || 0}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  name="is_active"
                  defaultChecked={editingProduct?.is_active ?? true}
                />
                <Label>Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  name="is_featured"
                  defaultChecked={editingProduct?.is_featured}
                />
                <Label>Featured</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Product'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}