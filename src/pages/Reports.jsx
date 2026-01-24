import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Download, RefreshCw, FileText, TrendingUp, Users, Clock, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import SalesReport from "../components/reports/SalesReport";
import EmployeePerformanceReport from "../components/reports/EmployeePerformanceReport";
import TimeTrackingReport from "../components/reports/TimeTrackingReport";
import PresetReports from "../components/reports/PresetReports";
import PermissionGate from '../components/PermissionGate';
import FeatureGate from '../components/motherboard/FeatureGate.jsx';
import PremiumAnalytics from '../components/reports/PremiumAnalytics.jsx';

export default function ReportsPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  useEffect(() => {
    loadUser();
    loadData();
  }, []);

  const loadUser = async () => {
    try {
      const pinUserJSON = localStorage.getItem('pinLoggedInUser');
      if (pinUserJSON) {
        setCurrentUser(JSON.parse(pinUserJSON));
      } else {
        const userData = await base44.auth.me();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderList, productList, customerList, employeeList, timeEntryList, deptList] = await Promise.all([
        base44.entities.Order.list("-created_date"),
        base44.entities.Product.list(),
        base44.entities.Customer.list(),
        base44.entities.User.list(),
        base44.entities.TimeEntry.list("-clock_in"),
        base44.entities.Department.list().catch(() => [])
      ]);
      setOrders(orderList);
      setProducts(productList);
      setCustomers(customerList);
      setEmployees(employeeList);
      setTimeEntries(timeEntryList);
      setDepartments(deptList);
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOrders = () => {
    return orders.filter(order => {
      const orderDate = new Date(order.created_date);
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);

      const dateMatch = orderDate >= dateRange.from && orderDate <= endDate;
      const employeeMatch = selectedEmployee === "all" || order.created_by === selectedEmployee;
      
      let departmentMatch = true;
      if (selectedDepartment !== "all" && order.items) {
        departmentMatch = order.items.some(item => {
          const product = products.find(p => p.id === item.product_id);
          return product && product.department === selectedDepartment;
        });
      }

      return dateMatch && employeeMatch && departmentMatch;
    });
  };

  const getFilteredTimeEntries = () => {
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.clock_in);
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);

      const dateMatch = entryDate >= dateRange.from && entryDate <= endDate;
      const employeeMatch = selectedEmployee === "all" || entry.user_id === selectedEmployee;

      return dateMatch && employeeMatch;
    });
  };

  const filteredOrders = getFilteredOrders();
  const filteredTimeEntries = getFilteredTimeEntries();

  return (
    <PermissionGate permission="view_reports">
      <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 dark:text-white">
                <BarChart3 className="w-8 h-8 text-blue-500" /> Reports & Analytics
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Comprehensive business intelligence and insights</p>
            </div>
            <Button onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg dark:text-white">Report Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block dark:text-gray-200">Date Range</label>
                  <DateRangePicker range={dateRange} onRangeChange={setDateRange} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block dark:text-gray-200">Employee</label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder="All Employees" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem value="all" className="dark:text-white">All Employees</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id} className="dark:text-white">
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block dark:text-gray-200">Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem value="all" className="dark:text-white">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.name} className="dark:text-white">
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    className="w-full dark:border-gray-600 dark:text-white"
                    onClick={() => {
                      setSelectedEmployee("all");
                      setSelectedDepartment("all");
                      setDateRange({
                        from: new Date(new Date().setDate(new Date().getDate() - 30)),
                        to: new Date()
                      });
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="sales" className="space-y-6">
            <TabsList className="dark:bg-gray-800">
              <TabsTrigger value="sales" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-200">
                <TrendingUp className="w-4 h-4 mr-2" />
                Sales
              </TabsTrigger>
              <TabsTrigger value="premium" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-200">
                <Sparkles className="w-4 h-4 mr-2" />
                Premium Analytics
              </TabsTrigger>
              <TabsTrigger value="employees" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-200">
                <Users className="w-4 h-4 mr-2" />
                Employees
              </TabsTrigger>
              <TabsTrigger value="time" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-200">
                <Clock className="w-4 h-4 mr-2" />
                Time Tracking
              </TabsTrigger>
              <TabsTrigger value="preset" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-200">
                <FileText className="w-4 h-4 mr-2" />
                Preset Reports
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sales">
              <SalesReport 
                orders={filteredOrders}
                products={products}
                customers={customers}
                dateRange={dateRange} 
                loading={loading}
                selectedEmployee={selectedEmployee}
                selectedDepartment={selectedDepartment}
              />
            </TabsContent>

            <TabsContent value="premium">
              <FeatureGate chipName="Advanced Analytics">
                <PremiumAnalytics 
                  merchantId={currentUser?.merchant_id}
                  dateRange={dateRange}
                />
              </FeatureGate>
            </TabsContent>

            <TabsContent value="employees">
              <EmployeePerformanceReport
                employees={employees}
                orders={filteredOrders}
                dateRange={dateRange}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="time">
              <TimeTrackingReport
                employees={employees}
                timeEntries={filteredTimeEntries}
                dateRange={dateRange}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="preset">
              <PresetReports
                orders={filteredOrders}
                products={products}
                customers={customers}
                employees={employees}
                timeEntries={filteredTimeEntries}
                departments={departments}
                dateRange={dateRange}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PermissionGate>
  );
}