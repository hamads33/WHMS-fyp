'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton } from '@/components/LoadingSkeletons';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function InstallerPage() {
  const [token, setToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [pollingId, setPollingId] = useState(null);
  const { toast } = useToast();

  // Poll for agent status every 10 seconds
  useEffect(() => {
    const pollStatus = async () => {
      if (!getToken()) return;

      try {
        const res = await apiClient.get('/tenant/me');
        if (res.success) {
          setAgentStatus(res.data?.agent_status || null);
        }
      } catch (error) {
        console.error('Failed to fetch agent status:', error);
      }
    };

    const id = setInterval(pollStatus, 10000);
    setPollingId(id);

    // Initial fetch
    pollStatus();

    return () => clearInterval(id);
  }, []);

  const handleGenerateToken = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/installer/token/generate', {});

      if (response.success && response.data) {
        setToken(response.data.token);
        setTokenExpiry(response.data.expires_at);
        toast({
          title: 'Success',
          description: 'Install token generated successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to generate token',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate token',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCommand = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const command = `curl -fsSL https://install.whms.io/install.sh | bash -s -- --token ${token} --api ${apiUrl}`;

    navigator.clipboard.writeText(command);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast({
      title: 'Copied',
      description: 'Command copied to clipboard',
    });
  };

  const getExpiryCountdown = () => {
    if (!tokenExpiry) return null;
    const now = new Date();
    const expiry = new Date(tokenExpiry);
    const diff = expiry - now;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Installer" />

      {/* Step 1: Generate Token */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1: Generate Install Token</CardTitle>
          <CardDescription>Create a token to authenticate the installer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {token ? (
            <div className="space-y-3">
              <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                {token}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Expires in:</span>
                <Badge variant="secondary">{getExpiryCountdown()}</Badge>
              </div>
              <Button
                onClick={handleGenerateToken}
                variant="outline"
                className="w-full"
              >
                Generate New Token
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleGenerateToken}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Generating...' : 'Generate Token'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Run Installer */}
      {token && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Run the Installer</CardTitle>
            <CardDescription>Execute this command on your server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg font-mono text-sm overflow-x-auto">
              <pre>{`curl -fsSL https://install.whms.io/install.sh | bash -s -- \\
  --token ${token} \\
  --api ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}`}</pre>
            </div>
            <Button
              onClick={handleCopyCommand}
              className="w-full"
            >
              {isCopied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Command
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Agent Status */}
      {token && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Agent Status</CardTitle>
            <CardDescription>Monitor your agent installation (updates every 10 seconds)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${
                agentStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
              }`} />
              <div>
                <p className="font-medium">
                  {agentStatus === 'online' ? 'Agent Connected' : 'Waiting for agent...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Current status: <span className="font-mono">{agentStatus || 'not installed'}</span>
                </p>
              </div>
            </div>
            {agentStatus === 'online' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                Your agent is successfully installed and connected!
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
