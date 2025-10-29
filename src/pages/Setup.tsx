/**
 * Initial setup screen for when repository is not configured
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Titlebar } from '@/components/layout/Titlebar';
import { RepositoryConnectForm } from '@/components/kopia/RepositoryConnectForm';
import { RepositoryCreateForm } from '@/components/kopia/RepositoryCreateForm';
import { Database, FolderPlus, Info, ArrowLeft } from 'lucide-react';

type SetupView = 'choice' | 'connect' | 'create';

export function Setup() {
  const navigate = useNavigate();
  const [view, setView] = useState<SetupView>('choice');

  const handleConnectExisting = () => {
    setView('connect');
  };

  const handleCreateNew = () => {
    setView('create');
  };

  const handleSuccess = () => {
    // Redirect to the main app after successful connection/creation
    navigate('/');
  };

  const handleBackToChoice = () => {
    setView('choice');
  };

  return (
    <>
      <Titlebar />
      <div className="flex items-center justify-center min-h-screen p-6 pt-14">
        <div className="w-full max-w-2xl space-y-6">
          {view === 'connect' ? (
            <>
              {/* Back button */}
              <Button variant="ghost" size="sm" onClick={handleBackToChoice} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to options
              </Button>

              {/* Connection Form */}
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Connect to Repository</h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your repository details to connect
                  </p>
                </div>
                <RepositoryConnectForm
                  onSuccess={handleSuccess}
                  onNeedsCreate={() => setView('create')}
                />
              </div>
            </>
          ) : view === 'create' ? (
            <>
              {/* Back button */}
              <Button variant="ghost" size="sm" onClick={handleBackToChoice} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to options
              </Button>

              {/* Creation Form */}
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Create New Repository</h1>
                  <p className="text-sm text-muted-foreground">Set up a new backup repository</p>
                </div>
                <RepositoryCreateForm onSuccess={handleSuccess} />
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">Welcome to Kopia UI</h1>
                <p className="text-lg text-muted-foreground">
                  Get started by connecting to an existing repository or creating a new one
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Kopia is a fast and secure backup tool. Your data is encrypted and deduplicated
                  before being stored in your chosen storage location.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Connect to Existing Repository */}
                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Connect Existing
                    </CardTitle>
                    <CardDescription>
                      Connect to a repository you've already created
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleConnectExisting} className="w-full" variant="default">
                      <Database className="mr-2 h-4 w-4" />
                      Connect Repository
                    </Button>
                  </CardContent>
                </Card>

                {/* Create New Repository */}
                <Card className="cursor-pointer hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderPlus className="h-5 w-5" />
                      Create New
                    </CardTitle>
                    <CardDescription>Set up a new backup repository from scratch</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleCreateNew} className="w-full" variant="outline">
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Create Repository
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> Your repository password cannot be recovered if lost.
                  Make sure to store it in a secure location like a password manager.
                </AlertDescription>
              </Alert>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Need help?{' '}
                  <a
                    href="https://kopia.io/docs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Read the documentation
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
