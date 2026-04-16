'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { CardSkeleton } from '@/components/LoadingSkeletons';
import { EmptyState } from '@/components/EmptyState';
import { apiClient } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function BillingPage() {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscribingTo, setSubscribingTo] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!getToken()) return;

      try {
        const [subRes, plansRes] = await Promise.all([
          apiClient.get('/billing/subscription'),
          apiClient.get('/billing/plans'),
        ]);

        if (subRes.success) {
          setSubscription(subRes.data);
        }
        if (plansRes.success) {
          setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load billing information',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleSubscribe = async (planId) => {
    setSubscribingTo(planId);
    try {
      const response = await apiClient.post('/billing/subscribe', {
        plan_id: planId,
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Successfully subscribed to the plan',
        });
        // Refetch subscription
        const subRes = await apiClient.get('/billing/subscription');
        if (subRes.success) {
          setSubscription(subRes.data);
        }
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to subscribe',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to subscribe',
        variant: 'destructive',
      });
    } finally {
      setSubscribingTo(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Billing" />
        <CardSkeleton count={1} />
        <h2 className="text-lg font-semibold">Available Plans</h2>
        <CardSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" />

      {/* Current Subscription */}
      {subscription ? (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Plan Name</p>
                <p className="text-lg font-semibold mt-1">{subscription.plan_name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Price</p>
                <p className="text-lg font-semibold mt-1">
                  ${subscription.price}/{subscription.billing_cycle}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Renewal Date</p>
                <p className="text-lg font-semibold mt-1">
                  {new Date(subscription.renewal_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Status</p>
                <div className="mt-1">
                  <StatusBadge status={subscription.status} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Available Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        {plans.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="No plans available"
            description="Please contact support"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.plan_id === plan.id;
              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col ${
                    isCurrentPlan ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription className="text-lg font-semibold mt-2">
                          ${plan.price}/{plan.billing_cycle}
                        </CardDescription>
                      </div>
                      {isCurrentPlan && (
                        <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">
                          Current
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground mb-4">
                      {plan.description}
                    </p>

                    {plan.trial_days > 0 && (
                      <p className="text-xs text-blue-600 mb-4">
                        Free trial: {plan.trial_days} days
                      </p>
                    )}

                    <div className="space-y-2 mb-4 flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Features</p>
                      {plan.features && Object.keys(plan.features).length > 0 ? (
                        Object.entries(plan.features).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-foreground capitalize">
                              {key.replace(/_/g, ' ')}: <span className="font-medium">{String(value)}</span>
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No features listed</p>
                      )}
                    </div>

                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isCurrentPlan || subscribingTo === plan.id}
                      className="w-full"
                    >
                      {subscribingTo === plan.id
                        ? 'Subscribing...'
                        : isCurrentPlan
                          ? 'Current Plan'
                          : 'Subscribe'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
