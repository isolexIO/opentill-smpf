import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users as UsersIcon,
  Plus,
  Search,
  Clock,
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  LogIn,
  LogOut
} from 'lucide-react';
import PermissionGate from '../components/PermissionGate';
import MobileUserCard from '@/components/mobile/MobileUserCard';
import EmployeeForm from '../components/users/EmployeeForm';
import EmployeeList from '../components/users/EmployeeList';
import PerformanceTab from '../components/users/PerformanceTab';
import TimeTrackingTab from '../components/users/TimeTrackingTab';

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('pinLoggedInUser')) || await base44.auth.me();
      setCurrentUser(user);
      
      const [employeesList, timeEntriesList, ordersList] = await Promise.all([
        base44.entities.User.filter({ merchant_id: user.merchant_id }),
        base44.entities.TimeEntry.filter({ merchant_id: user.merchant_id }, '-created_date', 100),
        base44.entities.Order.filter({ merchant_id: user.merchant_id, status: 'completed' }, '-created_date', 200)
      ]);

      setEmployees(employeesList);
      setTimeEntries(timeEntriesList);
      setOrders(ordersList);
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      const timeEntry = await base44.entities.TimeEntry.create({
        merchant_id: currentUser.merchant_id,
        dealer_id: currentUser.dealer_id,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        clock_in: new Date().toISOString(),
        status: 'clocked_in',
        station_id: currentUser.pos_settings?.station_id
      });

      await base44.entities.User.update(currentUser.id, {
        currently_clocked_in: true,
        current_time_entry_id: timeEntry.id
      });

      // Update local storage
      const updatedUser = { ...currentUser, currently_clocked_in: true, current_time_entry_id: timeEntry.id };
      localStorage.setItem('pinLoggedInUser', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      loadData();
      alert('Clocked in successfully!');
    } catch (error) {
      console.error('Error clocking in:', error);
      alert('Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    try {
      const clockOutTime = new Date();
      const timeEntry = timeEntries.find(t => t.id === currentUser.current_time_entry_id);
      
      if (timeEntry) {
        const clockInTime = new Date(timeEntry.clock_in);
        const hoursWorked = (clockOutTime - clockInTime) / (1000 * 60 * 60);

        await base44.entities.TimeEntry.update(timeEntry.id, {
          clock_out: clockOutTime.toISOString(),
          hours_worked: hoursWorked,
          status: 'clocked_out'
        });

        await base44.entities.User.update(currentUser.id, {
          currently_clocked_in: false,
          current_time_entry_id: null,
          total_hours_worked: (currentUser.total_hours_worked || 0) + hoursWorked
        });

        const updatedUser = { ...currentUser, currently_clocked_in: false, current_time_entry_id: null };
        localStorage.setItem('pinLoggedInUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);

        loadData();
        alert(`Clocked out! You worked ${hoursWorked.toFixed(2)} hours.`);
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      alert('Failed to clock out');
    }
  };

  const stats = {
    totalEmployees: employees.length,
    activeEmployees: employees.filter(e => e.is_active).length,
    clockedIn: employees.filter(e => e.currently_clocked_in).length,
    totalPayroll: employees.reduce((sum, e) => sum + ((e.hourly_rate || 0) * (e.total_hours_worked || 0)), 0)
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PermissionGate permission="manage_users">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UsersIcon className="w-8 h-8 text-blue-600" />
                Employee Management
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Manage staff, track performance, and monitor time
              </p>
            </div>
            <div className="flex gap-3">
              {currentUser && (
                <Button
                  onClick={currentUser.currently_clocked_in ? handleClockOut : handleClockIn}
                  variant={currentUser.currently_clocked_in ? 'destructive' : 'default'}
                >
                  {currentUser.currently_clocked_in ? (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Clock Out
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Clock In
                    </>
                  )}
                </Button>
              )}
              <Button onClick={() => { setEditingEmployee(null); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.totalEmployees}</p>
                  </div>
                  <UsersIcon className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.activeEmployees}</p>
                  </div>
                  <Award className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Clocked In</p>
                    <p className="text-2xl font-bold dark:text-white">{stats.clockedIn}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Payroll</p>
                    <p className="text-2xl font-bold dark:text-white">${stats.totalPayroll.toFixed(0)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="employees" className="space-y-6">
            <TabsList className="dark:bg-gray-800">
              <TabsTrigger value="employees" className="dark:data-[state=active]:bg-blue-600 dark:text-gray-300">
                <UsersIcon className="w-4 h-4 mr-2" />
                Employees
              </TabsTrigger>
              <TabsTrigger value="performance" className="dark:data-[state=active]:bg-blue-600 dark:text-gray-300">
                <TrendingUp className="w-4 h-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="time" className="dark:data-[state=active]:bg-blue-600 dark:text-gray-300">
                <Clock className="w-4 h-4 mr-2" />
                Time Tracking
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employees">
              {/* Mobile card layout */}
              <div className="md:hidden">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {filteredEmployees.map(emp => (
                  <MobileUserCard
                    key={emp.id}
                    employee={emp}
                    onEdit={(e) => { setEditingEmployee(e); setShowForm(true); }}
                  />
                ))}
              </div>

              {/* Desktop table */}
              <Card className="hidden md:block dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="dark:text-white">Staff Directory</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <EmployeeList
                    employees={filteredEmployees}
                    onEdit={(emp) => { setEditingEmployee(emp); setShowForm(true); }}
                    onRefresh={loadData}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <PerformanceTab employees={employees} orders={orders} />
            </TabsContent>

            <TabsContent value="time">
              <TimeTrackingTab employees={employees} timeEntries={timeEntries} onRefresh={loadData} />
            </TabsContent>
          </Tabs>

          {showForm && (
            <EmployeeForm
              employee={editingEmployee}
              isOpen={showForm}
              onClose={() => { setShowForm(false); setEditingEmployee(null); }}
              onSave={loadData}
              currentUser={currentUser}
            />
          )}
        </div>
      </div>
    </PermissionGate>
  );
}