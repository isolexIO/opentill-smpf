import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Megaphone,
  Users,
  Building2,
  Copy,
  Check,
  Mail,
  Link2,
  TrendingUp,
  Send,
} from 'lucide-react';

export default function RecruitmentPortal() {
  const [ambassadors, setAmbassadors] = useState([]);
  const [builders, setBuilders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  // Email invite state
  const [invite, setInvite] = useState({ type: 'ambassador', name: '', email: '', note: '' });
  const [sending, setSending] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);

  const baseUrl = window.location.origin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ambList, bldList] = await Promise.all([
        base44.entities.Ambassador.list('-created_date', 200),
        base44.entities.Builder.list('-created_date', 200),
      ]);
      setAmbassadors(ambList || []);
      setBuilders(bldList || []);
    } catch (e) {
      console.error('Error loading recruitment data:', e);
    } finally {
      setLoading(false);
    }
  };

  const ambassadorLink = `${baseUrl}/DealerLanding`;
  const builderLink = `${baseUrl}/BuilderOnboarding`;

  const copyLink = async (key, link) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (e) {
      // fallback
      window.prompt('Copy this link:', link);
    }
  };

  const sendInvite = async () => {
    if (!invite.email || !invite.name) {
      setInviteMsg({ type: 'error', text: 'Please enter a name and email address.' });
      return;
    }
    setSending(true);
    setInviteMsg(null);
    try {
      const link = invite.type === 'ambassador' ? ambassadorLink : builderLink;
      const role = invite.type === 'ambassador' ? 'Ambassador' : 'Builder';
      const subject = `You're invited to become an Isolex ${role}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0b1120;color:#e5e7eb;border-radius:12px;overflow:hidden">
          <div style="padding:32px;background:linear-gradient(135deg,#7B2FD6,#0FD17A);text-align:center">
            <h1 style="color:#fff;margin:0;font-size:24px">Isolex Corporation</h1>
            <p style="color:#fff;opacity:0.9;margin:4px 0 0">${role} Invitation</p>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px">Hi ${invite.name},</p>
            <p style="line-height:1.6;color:#cbd5e1">
              You've been invited to join the Isolex platform as a <strong style="color:#fff">${role}</strong>.
              ${invite.note ? `<br/><br/>${invite.note.replace(/\n/g, '<br/>')}` : ''}
            </p>
            <div style="text-align:center;margin:28px 0">
              <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#7B2FD6,#0FD17A);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
                Get Started
              </a>
            </div>
            <p style="line-height:1.6;color:#94a3b8;font-size:13px">
              Or copy this link: ${link}
            </p>
            <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0"/>
            <p style="font-size:12px;color:#64748b">
              © ${new Date().getFullYear()} Isolex Corporation. All rights reserved.
            </p>
          </div>
        </div>`;

      const res = await base44.functions.invoke('sendEmail', {
        to: invite.email,
        subject,
        html,
      });
      const result = res?.data || res;
      if (result?.success) {
        setInviteMsg({ type: 'success', text: `Invitation sent to ${invite.email}` });
        setInvite({ type: invite.type, name: '', email: '', note: '' });
      } else {
        setInviteMsg({ type: 'error', text: result?.error || 'Failed to send invitation.' });
      }
    } catch (e) {
      setInviteMsg({ type: 'error', text: e.message || 'Failed to send invitation.' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading recruitment portal...</div>;
  }

  const recentAmbassadors = ambassadors.slice(0, 5);
  const recentBuilders = builders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-600 to-emerald-600 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Megaphone className="w-10 h-10" />
            <div>
              <h2 className="text-2xl font-bold">Recruitment Marketing Portal</h2>
              <p className="text-white/90 text-sm">Recruit new ambassadors and builders to grow the Isolex network.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Ambassadors</p>
                <p className="text-2xl font-bold">{ambassadors.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Ambassadors</p>
                <p className="text-2xl font-bold">{ambassadors.filter(a => a.status === 'active').length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Builders</p>
                <p className="text-2xl font-bold">{builders.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Verified Builders</p>
                <p className="text-2xl font-bold">{builders.filter(b => b.status === 'verified').length}</p>
              </div>
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ambassador Recruitment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              Ambassador Recruitment
            </CardTitle>
            <CardDescription>Share this link to recruit new ambassadors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
              <code className="text-xs flex-1 truncate">{ambassadorLink}</code>
              <Button size="sm" variant="outline" onClick={() => copyLink('amb', ambassadorLink)}>
                {copied === 'amb' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Recently Recruited Ambassadors</p>
              <div className="space-y-2">
                {recentAmbassadors.length === 0 && <p className="text-sm text-gray-400">None yet</p>}
                {recentAmbassadors.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-b pb-1">
                    <span className="truncate">{a.name}</span>
                    <Badge className={a.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Builder Recruitment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Builder Recruitment
            </CardTitle>
            <CardDescription>Share this link to recruit new chip builders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
              <code className="text-xs flex-1 truncate">{builderLink}</code>
              <Button size="sm" variant="outline" onClick={() => copyLink('bld', builderLink)}>
                {copied === 'bld' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Recently Recruited Builders</p>
              <div className="space-y-2">
                {recentBuilders.length === 0 && <p className="text-sm text-gray-400">None yet</p>}
                {recentBuilders.map(b => (
                  <div key={b.id} className="flex items-center justify-between text-sm border-b pb-1">
                    <span className="truncate">{b.full_name}</span>
                    <Badge className={b.status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Invitation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send a Personal Invitation
          </CardTitle>
          <CardDescription>Email a branded invitation directly to a prospect</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inviteMsg && (
            <Alert className={inviteMsg.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <AlertDescription className={inviteMsg.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {inviteMsg.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              variant={invite.type === 'ambassador' ? 'default' : 'outline'}
              onClick={() => setInvite({ ...invite, type: 'ambassador' })}
            >
              <Building2 className="w-4 h-4 mr-2" /> Ambassador
            </Button>
            <Button
              variant={invite.type === 'builder' ? 'default' : 'outline'}
              onClick={() => setInvite({ ...invite, type: 'builder' })}
            >
              <Users className="w-4 h-4 mr-2" /> Builder
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Recipient Name</Label>
              <Input
                value={invite.name}
                onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={invite.email}
                onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <div>
            <Label>Personal Note (optional)</Label>
            <Textarea
              value={invite.note}
              onChange={(e) => setInvite({ ...invite, note: e.target.value })}
              placeholder="I think you'd be a great fit because..."
              rows={3}
            />
          </div>

          <Button onClick={sendInvite} disabled={sending || !invite.email || !invite.name} className="w-full">
            {sending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Send Invitation
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}