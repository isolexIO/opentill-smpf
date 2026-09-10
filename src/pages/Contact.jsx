import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, Send, MapPin, Link2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/lib/i18n/useLanguage';

export default function ContactPage() {
  const { t } = useLanguage();

  const industryOptions = [
    { value: 'Convienance Store', label: t('contact.indConvenience') },
    { value: 'Restaurant', label: t('contact.indRestaurant') },
    { value: 'Automotive', label: t('contact.indAutomotive') },
    { value: 'Bar', label: t('contact.indBar') },
    { value: 'Apparel', label: t('contact.indApparel') },
    { value: 'Banking', label: t('contact.indBanking') },
    { value: 'Biotechnology', label: t('contact.indBiotechnology') },
    { value: 'Chemicals', label: t('contact.indChemicals') },
    { value: 'Communications', label: t('contact.indCommunications') },
    { value: 'Construction', label: t('contact.indConstruction') },
    { value: 'Consulting', label: t('contact.indConsulting') },
    { value: 'Education', label: t('contact.indEducation') },
    { value: 'Electronics', label: t('contact.indElectronics') },
    { value: 'Energy', label: t('contact.indEnergy') },
    { value: 'Engineering', label: t('contact.indEngineering') },
    { value: 'Entertainment', label: t('contact.indEntertainment') },
    { value: 'Environmental', label: t('contact.indEnvironmental') },
    { value: 'Finance', label: t('contact.indFinance') },
    { value: 'Food & Beverage', label: t('contact.indFoodBeverage') },
    { value: 'Government', label: t('contact.indGovernment') },
    { value: 'Healthcare', label: t('contact.indHealthcare') },
    { value: 'Hospitality', label: t('contact.indHospitality') },
    { value: 'Insurance', label: t('contact.indInsurance') },
    { value: 'Machinery', label: t('contact.indMachinery') },
    { value: 'Manufacturing', label: t('contact.indManufacturing') },
    { value: 'Media', label: t('contact.indMedia') },
    { value: 'Not For Profit', label: t('contact.indNotForProfit') },
    { value: 'Recreation', label: t('contact.indRecreation') },
    { value: 'Retail', label: t('contact.indRetail') },
    { value: 'Shipping', label: t('contact.indShipping') },
    { value: 'Technology', label: t('contact.indTechnology') },
    { value: 'Telecommunications', label: t('contact.indTelecommunications') },
    { value: 'Transportation', label: t('contact.indTransportation') },
    { value: 'Utilities', label: t('contact.indUtilities') },
    { value: 'Petro', label: t('contact.indPetro') },
    { value: 'Other', label: t('contact.indOther') },
  ];

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
      alert(t('contact.requiredFields') + required.join(", "));
      return false;
    }

    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-800 to-cyan-900">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            {t('contact.title')}
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            {t('contact.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6">
              {t('contact.sendMsg')}
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
                <Label htmlFor="company" className="text-white">{t('contact.company')}</Label>
                <Input
                  type="text"
                  name="company"
                  id="company"
                  required
                  label={t('contact.company').replace(' *', '')}
                  placeholder={t('contact.companyPh')}
                  className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstname" className="text-white">{t('contact.firstName')}</Label>
                  <Input
                    type="text"
                    name="firstname"
                    id="firstname"
                    required
                    label={t('contact.firstName').replace(' *', '')}
                    placeholder={t('contact.firstNamePh')}
                    className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label htmlFor="lastname" className="text-white">{t('contact.lastName')}</Label>
                  <Input
                    type="text"
                    name="lastname"
                    id="lastname"
                    required
                    label={t('contact.lastName').replace(' *', '')}
                    placeholder={t('contact.lastNamePh')}
                    className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-white">{t('contact.primaryPhone')}</Label>
                  <Input
                    type="text"
                    name="phone"
                    id="phone"
                    required
                    label={t('contact.primaryPhone').replace(' *', '')}
                    placeholder="+1 (555) 123-4567"
                    className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                  />
                </div>

                <div>
                  <Label htmlFor="mobile" className="text-white">{t('contact.mobilePhone')}</Label>
                  <Input
                    type="text"
                    name="mobile"
                    id="mobile"
                    label={t('contact.mobilePhone')}
                    placeholder="+1 (555) 987-6543"
                    className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="industry" className="text-white">{t('contact.industry')}</Label>
                <select 
                  name="industry" 
                  id="industry"
                  required
                  label={t('contact.industry').replace(' *', '')}
                  className="flex h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="" className="text-gray-900">{t('contact.selectIndustry')}</option>
                  {industryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="text-gray-900">{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="code" className="text-white">{t('contact.postalCode')}</Label>
                <Input
                  type="text"
                  name="code"
                  id="code"
                  required
                  label={t('contact.postalCode').replace(' *', '')}
                  placeholder="12345"
                  className="bg-white/10 text-white border-white/20 placeholder:text-white/50"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">{t('contact.description')}</Label>
                <Textarea
                  name="description"
                  id="description"
                  placeholder={t('contact.descPh')}
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
                {t('contact.send')}
                <Send className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">{t('contact.info')}</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{t('contact.email')}</h3>
                    <p className="text-white/80">SMPF@openTILL.io.io</p>
                    <p className="text-white/80">support@openTILL.io</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{t('contact.phone')}</h3>
                    <p className="text-white/80">+1 (419) 729-3889</p>
                    <p className="text-white/60 text-sm">{t('contact.phoneHours')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{t('contact.address')}</h3>
                    <p className="text-white/80">openTILL Corporation</p>
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