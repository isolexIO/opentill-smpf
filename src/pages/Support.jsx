import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Phone,
  Mail,
  MessageCircle, // New icon for live support
  Ticket,        // New icon for my tickets
  Book           // New icon for resources
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import UserManual from '../components/support/UserManual';
import ChatAvailabilityStatus from '../components/support/ChatAvailabilityStatus';

// This function is assumed to exist in the application's routing context.
// For standalone completeness, a placeholder is provided.
// In a real application, this would typically be imported from a router or utility file.
const createPageUrl = (pageName) => {
  switch (pageName) {
    case 'EmailLogin':
      return '/login'; // Common login page route
    // Add other page mappings as needed
    default:
      return `/${pageName.toLowerCase()}`;
  }
};

const TICKET_CATEGORIES = [
  { value: 'billing', label: 'Billing & Subscriptions' },
  { value: 'devices', label: 'Device Issues' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'account', label: 'Account Management' },
  { value: 'marketplace', label: 'Marketplace Integration' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'other', label: 'Other' }
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

const STATUS_CONFIG = {
  open: { label: 'Open', icon: Clock, color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Progress', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800' },
  waiting_on_merchant: { label: 'Waiting on You', icon: MessageSquare, color: 'bg-purple-100 text-purple-800' },
  resolved: { label: 'Resolved', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  closed: { label: 'Closed', icon: CheckCircle, color: 'bg-gray-100 text-gray-800' }
};

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [merchant, setMerchant] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [activeTab, setActiveTab] = useState('live_support'); // New state for active tab

  const [newTicket, setNewTicket] = useState({
    category: 'technical',
    priority: 'medium',
    subject: '',
    description: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser.merchant_id) {
        const merchants = await base44.entities.Merchant.filter({ id: currentUser.merchant_id });
        if (merchants && merchants.length > 0) {
          setMerchant(merchants[0]);
        } else {
          console.error("Invalid merchant_id found on user. Logging out.");
          localStorage.clear();
          window.location.href = createPageUrl('EmailLogin');
          return;
        }
      }

      await loadTickets(currentUser);
    } catch (error) {
      console.error('Error loading user or merchant:', error);
      if (error.message && error.message.includes('Object not found')) {
        console.error("Referenced merchant not found. Logging out.");
        localStorage.clear();
        window.location.href = createPageUrl('EmailLogin');
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async (currentUser) => {
    try {
      let ticketList;
      if (currentUser.role === 'admin') {
        ticketList = await base44.entities.SupportTicket.list('-created_date');
      } else {
        ticketList = await base44.entities.SupportTicket.filter(
          { merchant_id: currentUser.merchant_id },
          '-created_date'
        );
      }
      setTickets(ticketList);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const ticketNumber = `TKT-${Date.now()}`;

      await base44.entities.SupportTicket.create({
        ticket_number: ticketNumber,
        merchant_id: user.merchant_id || null,
        merchant_name: merchant?.business_name || 'Super Admin',
        submitted_by: user.id,
        submitted_by_email: user.email,
        category: newTicket.category,
        priority: newTicket.priority,
        status: 'open',
        subject: newTicket.subject,
        description: newTicket.description,
        responses: []
      });

      alert('Ticket submitted successfully!');
      setShowNewTicket(false);
      setNewTicket({
        category: 'technical',
        priority: 'medium',
        subject: '',
        description: ''
      });
      await loadTickets(user);
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket. Please try again.');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      const response = {
        user_id: user.id,
        user_name: user.full_name,
        user_role: user.role,
        message: replyMessage,
        timestamp: new Date().toISOString(),
        attachments: []
      };

      const updatedResponses = [...(selectedTicket.responses || []), response];

      await base44.entities.SupportTicket.update(selectedTicket.id, {
        responses: updatedResponses,
        last_response_at: new Date().toISOString(),
        last_response_by: user.full_name,
        status: user.role === 'admin' ? 'waiting_on_merchant' : 'in_progress'
      });

      setReplyMessage('');
      const updatedTicket = { ...selectedTicket, responses: updatedResponses };
      setSelectedTicket(updatedTicket);
      await loadTickets(user);
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      await base44.entities.SupportTicket.update(ticketId, {
        status: newStatus,
        ...(newStatus === 'resolved' && {
          resolved_at: new Date().toISOString(),
          resolved_by: user.full_name
        })
      });
      await loadTickets(user);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Support Center
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Get help with openTILL POS — We're here to help!
          </p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="live_support" className="text-xs sm:text-sm">
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Live Support</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs sm:text-sm">
              <Ticket className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">My Tickets ({tickets.length})</span>
              <span className="sm:hidden">Tickets</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="text-xs sm:text-sm">
              <Book className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Resources
            </TabsTrigger>
          </TabsList>

          {/* Live Support Tab */}
          <TabsContent value="live_support" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Live Chat Support
                </CardTitle>
                <CardDescription>
                  Connect with our support team instantly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <ChatAvailabilityStatus showLabel={true} />
                  <div className="flex-1">
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      Live Chat Support
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Connect instantly with our support team
                    </p>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => window.open('https://071be2.c.myucm.cloud/liveChat?liveChatAccess=MF83MDA2N2YzNDg5OTQ0OWI0OTdiMzhlMWQyNDhkNTg5Ml8wMDBiODIwNzFiZTImNmI3ODBlYzM4ZThmMWQyYjNiNDcwMTliMWM1OWM2MzA=', '_blank')}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Start Live Chat
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm sm:text-base">Phone Support (Call/Text)</p>
                      <a href="tel:419-729-3889" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                        419-729-3889
                      </a>
                      <p className="text-xs text-gray-500">Available for calls and text messages</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm sm:text-base">Email Support</p>
                      <a href="mailto:support@isolex.io" className="text-sm text-blue-600 hover:underline dark:text-blue-400 break-all">
                        support@isolex.io
                      </a>
                      <p className="text-xs text-gray-500">24-48 hour response</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Support Tickets</CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button onClick={() => setShowNewTicket(true)} className="ml-4">
                      <Plus className="w-4 h-4 mr-2" />
                      New Ticket
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket #</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No tickets found. Click "New Ticket" to create one.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTickets.map((ticket) => {
                          const statusConfig = STATUS_CONFIG[ticket.status];
                          const StatusIcon = statusConfig.icon;
                          const priorityConfig = PRIORITY_LEVELS.find(p => p.value === ticket.priority);

                          return (
                            <TableRow key={ticket.id}>
                              <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                              <TableCell className="font-medium">{ticket.subject}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {ticket.category.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={priorityConfig.color}>
                                  {priorityConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={statusConfig.color}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(ticket.created_date), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedTicket(ticket);
                                    setShowTicketDetail(true);
                                  }}
                                >
                                  <MessageSquare className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab - User Manual */}
          <TabsContent value="resources">
            <UserManual />
          </TabsContent>
        </Tabs>

        {/* New Ticket Dialog */}
        <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <Select
                    value={newTicket.category}
                    onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(v) => setNewTicket({ ...newTicket, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_LEVELS.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subject *</label>
                <Input
                  placeholder="Brief description of your issue"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <Textarea
                  placeholder="Provide detailed information about your issue..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="min-h-[150px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTicket(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket}>
                Submit Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ticket Detail Dialog */}
        {selectedTicket && (
          <Dialog open={showTicketDetail} onOpenChange={setShowTicketDetail}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    {selectedTicket.ticket_number}
                  </DialogTitle>
                  {user?.role === 'admin' && (
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(v) => handleUpdateStatus(selectedTicket.id, v)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Ticket Info */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold">{selectedTicket.subject}</h3>
                        <p className="text-sm text-gray-500 mt-1">{selectedTicket.description}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline">{selectedTicket.category}</Badge>
                        <Badge className={PRIORITY_LEVELS.find(p => p.value === selectedTicket.priority)?.color}>
                          {PRIORITY_LEVELS.find(p => p.value === selectedTicket.priority)?.label}
                        </Badge>
                        <Badge className={STATUS_CONFIG[selectedTicket.status].color}>
                          {STATUS_CONFIG[selectedTicket.status].label}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        Submitted {format(new Date(selectedTicket.created_date), 'PPP p')} by {selectedTicket.submitted_by_email}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Conversation Thread */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Conversation</h4>
                  {selectedTicket.responses?.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No responses yet. Add a message below.</p>
                  ) : (
                    selectedTicket.responses?.map((response, index) => (
                      <Card key={index} className={response.user_role === 'admin' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {response.user_name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{response.user_name}</span>
                                {response.user_role === 'admin' && (
                                  <Badge className="bg-red-100 text-red-800 text-xs">Support Team</Badge>
                                )}
                                <span className="text-xs text-gray-500">
                                  {format(new Date(response.timestamp), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm">{response.message}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>

                {/* Reply Section */}
                {selectedTicket.status !== 'closed' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">Add Response</label>
                    <Textarea
                      placeholder="Type your message..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={handleSendReply}
                        disabled={!replyMessage.trim()}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Reply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}