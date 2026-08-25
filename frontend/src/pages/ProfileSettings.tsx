import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { Shield, Smartphone, Laptop, LogOut, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

interface LoginHistory {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  reason: string | null;
  createdAt: string;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [history, setHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, historyRes] = await Promise.all([
        api.get('/auth/sessions'),
        api.get('/auth/history')
      ]);
      setSessions(sessionsRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Error fetching security data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleLogoutAllOther = async () => {
    if (!window.confirm('Are you sure you want to log out from all other devices?')) return;
    try {
      await api.post('/auth/logout-all');
      fetchSecurityData();
      toast.success('Successfully logged out from all other devices.');
    } catch (error) {
      toast.error('Failed to logout from other devices.');
    }
  };

  const parseDevice = (userAgent: string | null) => {
    if (!userAgent) return { type: 'Unknown', icon: <Laptop className="w-5 h-5 text-slate-500" /> };
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return { type: 'Mobile Device', icon: <Smartphone className="w-5 h-5 text-emerald-500" /> };
    }
    return { type: 'Desktop/Laptop', icon: <Laptop className="w-5 h-5 text-blue-500" /> };
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <h1 className="text-2xl font-bold">Security & Profile</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security & Profile</h1>
        <p className="text-slate-500 mt-1">Manage your active sessions and view your login activity.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 font-medium">Name</p>
              <p className="text-slate-900 font-semibold">{user?.name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Email</p>
              <p className="text-slate-900 font-semibold">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Role</p>
              <Badge variant="secondary" className="mt-1 capitalize">{user?.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="history">Login History</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Devices currently logged into your account.</CardDescription>
              </div>
              <Button onClick={handleLogoutAllOther} variant="outline" className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs">
                <LogOut className="w-4 h-4 mr-2" />
                Log out all other devices
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map(session => {
                  const device = parseDevice(session.userAgent);
                  return (
                    <div key={session.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white dark:bg-slate-950 rounded-full shadow-sm border border-slate-200 dark:border-slate-800">
                          {device.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-white">{device.type}</p>
                            {session.isCurrent && (
                              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Current Device</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            IP: {session.ipAddress || 'Unknown'} • Signed in: {format(new Date(session.createdAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Login History</CardTitle>
              <CardDescription>Recent login attempts to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto bg-white dark:bg-slate-950 shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                    <TableRow className="border-slate-200 dark:border-slate-800">
                      <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Date & Time</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">IP Address</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Device / Browser</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((log) => (
                      <TableRow key={log.id} className="border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <TableCell className="whitespace-nowrap font-mono text-xs">
                          {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>
                          {log.status === 'SUCCESS' ? (
                            <Badge variant="outline" className="border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 gap-1 text-xs">
                              <CheckCircle2 className="w-3 h-3" /> Success
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 gap-1 text-xs">
                              <XCircle className="w-3 h-3" /> Failed
                            </Badge>
                          )}
                          {log.reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{log.reason}</p>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.ipAddress || 'Unknown'}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-slate-600 dark:text-slate-400" title={log.userAgent || ''}>
                          {log.userAgent || 'Unknown'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {history.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                          No login history found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

