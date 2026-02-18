import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, Send, MapPin, Link2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ContactPage() {
  const handleFormSubmit = (e) => {
    const form = e.target;
    const inputs = form.elements;
    const required = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const isRequired = input.hasAttribute("required");
      const value = input.value;

      if (isRequired && value.trim() === "") {
        const label = input.getAttribute("label") || input.name;
        required.push(label);
      }
    }

    if (required.length > 0) {
      e.preventDefault();
      alert("The following fields are required: " + required.join(", "));
      return false;
    }

    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-800 to-cyan-900">
      {/* Navbar */}
      <nav className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = createPageUrl('Home')}>
              <Link2 className="w-8 h-8 text-white" />
              <span className="text-2xl font-bold text-white">openTILL</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href={createPageUrl('Home')} className="text-white hover:text-green-300 transition-colors">
                Home
              </a>
              <a href={createPageUrl('About')} className="text-white hover:text-green-300 transition-colors">
                About
              </a>
              <a href={createPageUrl('Contact')} className="text-green-300 font-semibold">
                Contact
              </a>
              <a href={createPageUrl('DeviceShop')} className="text-white hover:text-green-300 transition-colors">
                Device Shop
              </a>
              {/* Removed Dealer Link */}
              <Button 
                onClick={() => window.location.href = createPageUrl('PinLogin')}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Sign In
              </Button>
            </div>
            <div className="md:hidden">
              <Button 
                onClick={() => window.location.href = createPageUrl('PinLogin')}
                size="sm"
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6">
              Send us a Message
            </h2>
            <form 
              id="__vtigerWebForm" 
              name="openTILL" 
              action="https://console.isolex.net/modules/Webforms/capture.php" 
              method="post" 
              acceptCharset="utf-8" 
              encType="multipart/form-data"
              onSubmit={handleFormSubmit}
              className="space-y-6"
            >
              <input type="hidden" name="__vtrftk" value="sid:2cfd67a6ac654f2454ba88725c0d3f1b70795081,1766928478" />
              <input type="hidden" name="publicid" value="0f2ae2da8ebc23794ce1a94fc5c28791" />
              <input type="hidden" name="urlencodeenable" value="1" />
              <input type="hidden" name="name" value="openTILL" />
              
              <div>
                <Label htmlFor="company" className="text-white">Company *</Label>
                <Input
                  type="text"
                  name="company"
                  id="company"
                  required
                  label="Company"
                  placeholder="Your Company"
                  className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstname" className="text-white">First Name *</Label>
                  <Input
                    type="text"
                    name="firstname"
                    id="firstname"
                    required
                    label="First Name"
                    placeholder="John"
                    className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label htmlFor="lastname" className="text-white">Last Name *</Label>
                  <Input
                    type="text"
                    name="lastname"
                    id="lastname"
                    required
                    label="Last Name"
                    placeholder="Doe"
                    className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-white">Primary Phone *</Label>
                  <Input
                    type="text"
                    name="phone"
                    id="phone"
                    required
                    label="Primary Phone"
                    placeholder="+1 (555) 123-4567"
                    className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label htmlFor="mobile" className="text-white">Mobile Phone</Label>
                  <Input
                    type="text"
                    name="mobile"
                    id="mobile"
                    label="Mobile Phone"
                    placeholder="+1 (555) 987-6543"
                    className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="industry" className="text-white">Industry *</Label>
                <select 
                  name="industry" 
                  id="industry"
                  required
                  label="industry"
                  className="flex h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="" className="text-gray-900">Select Industry</option>
                  <option value="Convienance Store" className="text-gray-900">Convenience Store</option>
                  <option value="Restaurant" className="text-gray-900">Restaurant</option>
                  <option value="Automotive" className="text-gray-900">Automotive</option>
                  <option value="Bar" className="text-gray-900">Bar</option>
                  <option value="Apparel" className="text-gray-900">Apparel</option>
                  <option value="Banking" className="text-gray-900">Banking</option>
                  <option value="Biotechnology" className="text-gray-900">Biotechnology</option>
                  <option value="Chemicals" className="text-gray-900">Chemicals</option>
                  <option value="Communications" className="text-gray-900">Communications</option>
                  <option value="Construction" className="text-gray-900">Construction</option>
                  <option value="Consulting" className="text-gray-900">Consulting</option>
                  <option value="Education" className="text-gray-900">Education</option>
                  <option value="Electronics" className="text-gray-900">Electronics</option>
                  <option value="Energy" className="text-gray-900">Energy</option>
                  <option value="Engineering" className="text-gray-900">Engineering</option>
                  <option value="Entertainment" className="text-gray-900">Entertainment</option>
                  <option value="Environmental" className="text-gray-900">Environmental</option>
                  <option value="Finance" className="text-gray-900">Finance</option>
                  <option value="Food & Beverage" className="text-gray-900">Food & Beverage</option>
                  <option value="Government" className="text-gray-900">Government</option>
                  <option value="Healthcare" className="text-gray-900">Healthcare</option>
                  <option value="Hospitality" className="text-gray-900">Hospitality</option>
                  <option value="Insurance" className="text-gray-900">Insurance</option>
                  <option value="Machinery" className="text-gray-900">Machinery</option>
                  <option value="Manufacturing" className="text-gray-900">Manufacturing</option>
                  <option value="Media" className="text-gray-900">Media</option>
                  <option value="Not For Profit" className="text-gray-900">Not For Profit</option>
                  <option value="Recreation" className="text-gray-900">Recreation</option>
                  <option value="Retail" className="text-gray-900">Retail</option>
                  <option value="Shipping" className="text-gray-900">Shipping</option>
                  <option value="Technology" className="text-gray-900">Technology</option>
                  <option value="Telecommunications" className="text-gray-900">Telecommunications</option>
                  <option value="Transportation" className="text-gray-900">Transportation</option>
                  <option value="Utilities" className="text-gray-900">Utilities</option>
                  <option value="Petro" className="text-gray-900">Petro</option>
                  <option value="Other" className="text-gray-900">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="code" className="text-white">Postal Code *</Label>
                <Input
                  type="text"
                  name="code"
                  id="code"
                  required
                  label="Postal Code"
                  placeholder="12345"
                  className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">Description</Label>
                <Textarea
                  name="description"
                  id="description"
                  placeholder="Tell us more about your inquiry..."
                  rows={6}
                  className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                />
              </div>

              <select name="leadstatus" label="leadstatus" hidden defaultValue="New Lead">
                <option value="New Lead">New Lead</option>
              </select>

              <select name="leadsource" label="leadsource" hidden defaultValue="Web Site">
                <option value="Web Site">Web Site</option>
              </select>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full bg-gradient-to-r from-purple-600 to-green-500 hover:from-purple-700 hover:to-green-600 text-white"
              >
                Send Message
                <Send className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Email</h3>
                    <p className="text-white/80">info@isolex.io</p>
                    <p className="text-white/80">support@isolex.io</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Phone</h3>
                    <p className="text-white/80">+1 (419) 729-3889</p>
                    <p className="text-white/60 text-sm">Monday - Friday, 9am - 6pm EST</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Address</h3>
                    <p className="text-white/80">Isolex Corporation</p>
                    <p className="text-white/80">Toledo, OH</p>
                    <p className="text-white/80">United States</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}