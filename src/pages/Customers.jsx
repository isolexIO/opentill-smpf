import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Search,
  Edit,
  Star,
  TrendingUp,
  ShoppingCart,
  DollarSign
} from "lucide-react";

const getTier = (points) => {
  if (points >= 1000) return { name: "Platinum", color: "bg-gray-700 text-white", icon: <Star className="w-3 h-3 text-cyan-300" /> };
  if (points >= 500) return { name: "Gold", color: "bg-yellow-500 text-white", icon: <Star className="w-3 h-3 text-white" /> };
  if (points >= 200) return { name: "Silver", color: "bg-slate-400 text-white", icon: <Star className="w-3 h-3 text-yellow-200" /> };
  return { name: "Bronze", color: "bg-yellow-700 text-white", icon: null };
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check localStorage first for impersonation
      let currentUser;
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      if (pinUserJSON) {
        currentUser = JSON.parse(pinUserJSON);
      } else {
        currentUser = await base44.auth.me();
      }
      
      let customerList;
      if (currentUser.role === 'admin' && !currentUser.is_impersonating) {
        customerList = await base44.entities.Customer.list('-created_date');
      } else if (currentUser.merchant_id) {
        customerList = await base44.entities.Customer.filter(
          { merchant_id: currentUser.merchant_id },
          '-created_date'
        );
      } else {
        customerList = [];
      }
      
      setCustomers(customerList);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSaveCustomer = async (customerData) => {
    try {
      if (selectedCustomer) {
        await base44.entities.Customer.update(selectedCustomer.id, customerData);
      } else {
        // Use pinLoggedInUser (supports impersonation) or fall back to auth.me()
        const pinUserJSON = localStorage.getItem('pinLoggedInUser');
        const currentUser = pinUserJSON ? JSON.parse(pinUserJSON) : await base44.auth.me();
        const customerToCreate = { ...customerData };
        // Always set merchant_id for non-admin (including impersonated) users
        if (currentUser.merchant_id) {
          customerToCreate.merchant_id = currentUser.merchant_id;
        }
        if (currentUser.dealer_id) {
          customerToCreate.dealer_id = currentUser.dealer_id;
        }
        await base44.entities.Customer.create(customerToCreate);
      }
      await loadCustomers();
      setShowForm(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Error saving customer:", error);
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setShowForm(true);
  };
  
  const handleAddNew = () => {
    setSelectedCustomer(null);
    setShowForm(true);
  };
  
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const stats = {
    totalCustomers: customers.length,
    totalSpent: customers.reduce((sum, c) => sum + (c.total_spent || 0), 0).toFixed(2),
    avgSpent: (customers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / customers.length || 0).toFixed(2),
    totalVisits: customers.reduce((sum, c) => sum + (c.visit_count || 0), 0),
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-500" /> Customer Management
          </h1>
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" /> Add Customer
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Customers</p>
                  <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500"/>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Spent</p>
                  <p className="text-2xl font-bold">${stats.totalSpent}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500"/>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Average Spend</p>
                  <p className="text-2xl font-bold">${stats.avgSpent}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500"/>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Visits</p>
                  <p className="text-2xl font-bold">{stats.totalVisits}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-orange-500"/>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Loyalty</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Loading customers...</TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">No customers found.</TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map(customer => {
                    const tier = getTier(customer.loyalty_points);
                    return (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          <div>{customer.email}</div>
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${tier.color} flex items-center gap-1 w-fit`}>
                            {tier.icon}{tier.name} - {customer.loyalty_points} pts
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">${(customer.total_spent || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{customer.visit_count || 0}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
            </DialogHeader>
            <CustomerForm customer={selectedCustomer} onSave={handleSaveCustomer} onCancel={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function CustomerForm({ customer, onSave, onCancel }) {
  const [formData, setFormData] = useState(customer || { name: "", email: "", phone: "", notes: "" });

  useEffect(() => {
    setFormData(customer || { name: "", email: "", phone: "", notes: "" });
  }, [customer]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div>
        <label className="block text-sm font-medium mb-1">Name*</label>
        <Input value={formData.name} onChange={e => handleChange("name", e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <Input type="email" value={formData.email} onChange={e => handleChange("email", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <Input value={formData.phone} onChange={e => handleChange("phone", e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <Input value={formData.notes} onChange={e => handleChange("notes", e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}