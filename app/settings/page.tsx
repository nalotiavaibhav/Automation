'use client';

import { useState } from 'react';
import { Building2, Bot, Plug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IntegrationsPage } from '@/components/settings/integrations-page';

export default function SettingsPage() {
  const [companyName, setCompanyName] = useState('Flowmax Plumbing');
  const [phone, setPhone] = useState('(555) 123-4567');
  const [address, setAddress] = useState('123 Main St, Springfield, IL 62701');
  const [industry, setIndustry] = useState('Plumbing');
  const [greeting, setGreeting] = useState(
    'Thank you for calling Flowmax Plumbing! My name is Alex, your AI assistant. How can I help you today?'
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="ag-enter">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your AI receptionist and integrations</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="ag-glass rounded-full p-1">
          <TabsTrigger value="business" className="rounded-full transition-all duration-300 data-[state=active]:bg-white/80 data-[state=active]:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <Building2 className="h-4 w-4 mr-1.5" />
            Business Profile
          </TabsTrigger>
          <TabsTrigger value="ai" className="rounded-full transition-all duration-300 data-[state=active]:bg-white/80 data-[state=active]:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <Bot className="h-4 w-4 mr-1.5" />
            AI Configuration
          </TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-full transition-all duration-300 data-[state=active]:bg-white/80 data-[state=active]:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
            <Plug className="h-4 w-4 mr-1.5" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* Business Profile Tab */}
        <TabsContent value="business">
          <Card className="ag-glass ag-float-card rounded-xl ag-enter">
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Your business details used by the AI receptionist when speaking with customers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your company name"
                    className="transition-all duration-300 focus-visible:shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Business Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="transition-all duration-300 focus-visible:shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Business address"
                    className="transition-all duration-300 focus-visible:shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={industry} onValueChange={(v) => v && setIndustry(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Plumbing">Plumbing</SelectItem>
                      <SelectItem value="HVAC">HVAC</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="General Contracting">
                        General Contracting
                      </SelectItem>
                      <SelectItem value="Landscaping">Landscaping</SelectItem>
                      <SelectItem value="Cleaning">Cleaning</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button className="transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:-translate-y-px">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Configuration Tab */}
        <TabsContent value="ai">
          <Card className="ag-glass ag-float-card rounded-xl ag-enter">
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Customize how your AI receptionist greets and interacts with callers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting Message</Label>
                  <Textarea
                    id="greeting"
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                    placeholder="Enter the greeting your AI will use..."
                    rows={4}
                    className="transition-all duration-300 focus-visible:shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the first thing callers will hear when your AI receptionist answers.
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="voice">Voice</Label>
                    <Select defaultValue="alloy">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                        <SelectItem value="echo">Echo (Male)</SelectItem>
                        <SelectItem value="fable">Fable (British)</SelectItem>
                        <SelectItem value="onyx">Onyx (Male, Deep)</SelectItem>
                        <SelectItem value="nova">Nova (Female)</SelectItem>
                        <SelectItem value="shimmer">Shimmer (Female, Warm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue="en-US">
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="es-ES">Spanish</SelectItem>
                        <SelectItem value="fr-FR">French</SelectItem>
                        <SelectItem value="de-DE">German</SelectItem>
                        <SelectItem value="pt-BR">Portuguese (BR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button className="transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:-translate-y-px">Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <IntegrationsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
