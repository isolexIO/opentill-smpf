import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserPlus, Trash2, Star, StarOff } from 'lucide-react';
import { listContacts, addContact, removeContact } from '@/lib/smpfAddressBook';

export default function AddressBookManager() {
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState('');
  const [addr, setAddr] = useState('');
  const [business, setBusiness] = useState('');
  const [note, setNote] = useState('');
  const [trusted, setTrusted] = useState(false);

  useEffect(() => { refresh(); }, []);
  async function refresh() { setContacts(await listContacts().catch(() => [])); }

  async function add() {
    if (!name || !addr) return;
    if (trusted && !confirm('Marking this contact as trusted. Always confirm a trusted contact address before saving.')) return;
    await addContact({ name, address: addr.trim(), business, note, trusted });
    setName(''); setAddr(''); setBusiness(''); setNote(''); setTrusted(false);
    refresh();
  }

  async function del(a) {
    if (!confirm('Remove this contact?')) return;
    await removeContact(a);
    refresh();
  }

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="text-base text-white">Address book</CardTitle>
        <CardDescription className="text-white/50">Saved contacts live on this device only.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/10 border-white/20 text-white" />
          <Input placeholder="Business (optional)" value={business} onChange={(e) => setBusiness(e.target.value)} className="bg-white/10 border-white/20 text-white" />
        </div>
        <Input placeholder="Solana address" value={addr} onChange={(e) => setAddr(e.target.value)} className="bg-white/10 border-white/20 text-white font-mono text-sm" />
        <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="bg-white/10 border-white/20 text-white" />
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={trusted} onChange={(e) => setTrusted(e.target.checked)} />
          Trusted contact
        </label>
        <Button onClick={add} disabled={!name || !addr} className="w-full bg-white text-purple-700 hover:bg-gray-100">
          <UserPlus className="w-4 h-4 mr-2" /> Save contact
        </Button>

        <div className="space-y-2 pt-2">
          {contacts.map((c) => (
            <div key={c.address} className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
              {c.trusted ? <Star className="w-4 h-4 text-yellow-300 shrink-0" /> : <StarOff className="w-4 h-4 text-white/30 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{c.name}{c.business ? ` · ${c.business}` : ''}</p>
                <p className="text-xs font-mono text-white/50 break-all">{c.address}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(c.address)}><Trash2 className="w-4 h-4 text-red-300" /></Button>
            </div>
          ))}
          {!contacts.length && <p className="text-xs text-white/40 text-center py-2">No saved contacts.</p>}
        </div>
      </CardContent>
    </Card>
  );
}