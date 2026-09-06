'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Loader2, Search, Globe, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/currency-context';
import { currencyService, Currency } from '@/lib/currency-service';

export function CurrencySelector() {
  const { currency, updateCurrency, loading: currencyLoading } = useCurrency();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [popularCurrencies, setPopularCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const [allCurrencies, popular] = await Promise.all([
        currencyService.getAllCurrencies(),
        currencyService.getPopularCurrencies(),
      ]);
      setCurrencies(allCurrencies);
      setPopularCurrencies(popular);
      
      // Find current currency from the list
      const current = allCurrencies.find(c => c.code === currency.currencyCode);
      if (current) {
        setSelectedCurrency(current);
      }
    } catch (error) {
      console.error('Failed to load currencies:', error);
      toast.error('Failed to load currencies');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = async (currencyCode: string) => {
    const newCurrency = currencies.find(c => c.code === currencyCode);
    if (!newCurrency) return;

    try {
      setUpdating(true);
      await updateCurrency({
        currencyCode: newCurrency.code,
        currencySymbol: newCurrency.symbol,
        currencyName: newCurrency.currency,
      });
      setSelectedCurrency(newCurrency);
      toast.success(`Currency updated to ${newCurrency.currency}`);
    } catch (error) {
      console.error('Failed to update currency:', error);
      toast.error('Failed to update currency');
    } finally {
      setUpdating(false);
    }
  };

  const filteredCurrencies = currencies.filter(currency =>
    currency.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || currencyLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Currency Settings
          </CardTitle>
          <CardDescription>Choose your preferred currency for the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Currency Settings
        </CardTitle>
        <CardDescription>Choose your preferred currency for the system</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Currency Display */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div>
            <p className="font-medium">Current Currency</p>
            <p className="text-sm text-muted-foreground">
              {currency.currencyName} ({currency.currencyCode})
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {currency.currencySymbol}
          </Badge>
        </div>

        {/* Popular Currencies */}
        <div>
          <Label className="text-sm font-medium">Popular Currencies</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {popularCurrencies.map((curr) => (
              <Button
                key={curr.code}
                variant={selectedCurrency?.code === curr.code ? "default" : "outline"}
                size="sm"
                className="justify-start h-auto p-3"
                onClick={() => handleCurrencyChange(curr.code)}
                disabled={updating}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{curr.symbol}</span>
                    <span className="text-xs">{curr.code}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {curr.currency}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* All Currencies Selector */}
        <div className="space-y-2">
          <Label htmlFor="currency-search">All Currencies</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="currency-search"
              placeholder="Search currencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select
            value={selectedCurrency?.code || ''}
            onValueChange={handleCurrencyChange}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a currency" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {filteredCurrencies.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{curr.symbol}</span>
                    <div>
                      <div className="font-medium">{curr.currency}</div>
                      <div className="text-xs text-muted-foreground">
                        {curr.code} • {curr.country}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div className="p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium">Preview</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Sample amount: <span className="font-medium">{currency.currencySymbol}1,000</span>
          </p>
        </div>

        {updating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Updating currency preference...
          </div>
        )}
      </CardContent>
    </Card>
  );
}