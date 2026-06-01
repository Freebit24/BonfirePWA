'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  generateInviteLink,
  getEventInviteLinks,
  deleteInviteLink,
  getPendingJoinRequests,
  updateJoinRequest,
} from '@/app/actions/private-events';
import { EventInviteLink } from '@/types';
import { toast } from 'sonner';
import { 
  Link2, 
  Copy, 
  Trash2, 
  Check, 
  X, 
  Clock,
  Users,
  UserPlus,
  ExternalLink,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { formatDate } from '@/utils/helpers';
import { logger } from '@/lib/logger';

interface PrivateEventControlsProps {
  eventId: string;
  organizerId: string;
}

export default function PrivateEventControls({ eventId, organizerId }: PrivateEventControlsProps) {
  const [loading, setLoading] = useState(true);
  const [inviteLinks, setInviteLinks] = useState<EventInviteLink[]>([]);
  const [joinRequests, setJoinRequests] = useState<Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    createdAt: string;
  }>>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviteOptions, setInviteOptions] = useState({
    isSingleUse: false,
    expiresInHours: 0,
    maxUses: 0,
  });
  const [deleteInviteId, setDeleteInviteId] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [eventId, organizerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      // Load invite links
      const invitesResult = await getEventInviteLinks(eventId, organizerId);
      if (invitesResult.success && invitesResult.data) {
        setInviteLinks(invitesResult.data);
      }

      // Load join requests
      const requestsResult = await getPendingJoinRequests(eventId, organizerId);
      if (requestsResult.success && requestsResult.data) {
        setJoinRequests(requestsResult.data);
      }
    } catch (error) {
      console.error('Error loading private event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    setCreating(true);
    try {
      const result = await generateInviteLink(eventId, organizerId, {
        isSingleUse: inviteOptions.isSingleUse,
        expiresInHours: inviteOptions.expiresInHours > 0 ? inviteOptions.expiresInHours : undefined,
        maxUses: inviteOptions.maxUses > 0 ? inviteOptions.maxUses : undefined,
      });

      if (result.success && result.data) {
        setInviteLinks([result.data, ...inviteLinks]);
        setShowCreateDialog(false);
        setInviteOptions({ isSingleUse: false, expiresInHours: 0, maxUses: 0 });
        toast.success('Invite link created!');
      } else {
        toast.error(result.error || 'Failed to create invite link');
      }
    } catch (error) {
      toast.error('Failed to create invite link');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyInvite = async (token: string) => {
    const origin = typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || '');
    const inviteUrl = `${origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Invite link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy invite link');
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      const result = await deleteInviteLink(inviteId, organizerId);
      if (result.success) {
        setInviteLinks(inviteLinks.filter(inv => inv.id !== inviteId));
        toast.success('Invite link deleted');
      } else {
        toast.error(result.error || 'Failed to delete invite link');
      }
    } catch (error) {
      toast.error('Failed to delete invite link');
    }
    setDeleteInviteId(null);
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const result = await updateJoinRequest(requestId, 'approved', organizerId);
      if (result.success) {
        setJoinRequests(joinRequests.filter(req => req.id !== requestId));
        toast.success('Join request approved');
      } else {
        toast.error(result.error || 'Failed to approve request');
      }
    } catch (error) {
      toast.error('Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const result = await updateJoinRequest(requestId, 'rejected', organizerId);
      if (result.success) {
        setJoinRequests(joinRequests.filter(req => req.id !== requestId));
        toast.success('Join request rejected');
      } else {
        toast.error(result.error || 'Failed to reject request');
      }
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const getInviteStatus = (invite: EventInviteLink) => {
    if (invite.is_single_use && invite.is_used) {
      return { label: 'Used', color: 'text-gray-500' };
    }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { label: 'Expired', color: 'text-red-500' };
    }
    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
      return { label: 'Max Uses Reached', color: 'text-orange-500' };
    }
    return { label: 'Active', color: 'text-green-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Join Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Pending Join Requests
              </CardTitle>
              <CardDescription>
                Approve or reject users who want to join your private event
              </CardDescription>
            </div>
            <Badge variant="secondary">{joinRequests.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {joinRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending join requests</p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {joinRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar>
                        <AvatarFallback>
                          {request.userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{request.userName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {request.userEmail}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => handleApproveRequest(request.id)}
                        disabled={processingRequest === request.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={processingRequest === request.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Invite Links */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Invite Links
              </CardTitle>
              <CardDescription>
                Create and manage shareable invite links for your private event
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Create Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {inviteLinks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Link2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="mb-4">No invite links created yet</p>
              <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                Create Your First Invite Link
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {inviteLinks.map((invite) => {
                  const status = getInviteStatus(invite);
                  return (
                    <motion.div
                      key={invite.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={status.color}>
                              {status.label}
                            </Badge>
                            {invite.is_single_use && (
                              <Badge variant="secondary">Single Use</Badge>
                            )}
                            {invite.max_uses && (
                              <Badge variant="secondary">
                                {invite.current_uses}/{invite.max_uses} uses
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Created {formatDate(invite.created_at)}</span>
                            {invite.expires_at && (
                              <>
                                <span>•</span>
                                <Clock className="h-3.5 w-3.5" />
                                <span>Expires {formatDate(invite.expires_at)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyInvite(invite.token)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteInviteId(invite.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-900 p-2 rounded border text-xs font-mono break-all">
                        {`${typeof window !== 'undefined' && window.location?.origin ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || '')}/invite/${invite.token}`}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Invite Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invite Link</DialogTitle>
            <DialogDescription>
              Configure how this invite link will work
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Single Use</Label>
                <p className="text-sm text-gray-500">Link can only be used once</p>
              </div>
              <Switch
                checked={inviteOptions.isSingleUse}
                onCheckedChange={(checked) => 
                  setInviteOptions({ ...inviteOptions, isSingleUse: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Expires In (hours)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0 = Never expires"
                value={inviteOptions.expiresInHours || ''}
                onChange={(e) => 
                  setInviteOptions({ 
                    ...inviteOptions, 
                    expiresInHours: parseInt(e.target.value) || 0 
                  })
                }
              />
              <p className="text-xs text-gray-500">
                Leave as 0 for links that never expire
              </p>
            </div>

            <div className="space-y-2">
              <Label>Maximum Uses</Label>
              <Input
                type="number"
                min="0"
                placeholder="0 = Unlimited"
                value={inviteOptions.maxUses || ''}
                onChange={(e) => 
                  setInviteOptions({ 
                    ...inviteOptions, 
                    maxUses: parseInt(e.target.value) || 0 
                  })
                }
              />
              <p className="text-xs text-gray-500">
                Leave as 0 for unlimited uses
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateInvite} disabled={creating}>
              {creating ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Create Link
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog 
        open={deleteInviteId !== null} 
        onOpenChange={(open) => !open && setDeleteInviteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invite Link?</AlertDialogTitle>
            <AlertDialogDescription>
              This invite link will no longer work. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInviteId && handleDeleteInvite(deleteInviteId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
