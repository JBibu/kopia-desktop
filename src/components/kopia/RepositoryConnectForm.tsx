/**
 * Repository connection form component with multi-step flow
 */

import { useState, useEffect } from 'react';
import { useRepository } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Database, AlertCircle, Shield, HardDrive, ChevronRight, User } from 'lucide-react';
import { toast } from 'sonner';
import { repositoryExists, getCurrentUser, type StorageType } from '@/lib/kopia/client';
import { getErrorMessage } from '@/lib/utils';

const storageOptions = [
  { value: 'filesystem', label: 'Local Filesystem', icon: HardDrive },
  { value: 's3', label: 'Amazon S3', icon: Database },
  { value: 'gcs', label: 'Google Cloud Storage', icon: Database },
  { value: 'azureBlob', label: 'Azure Blob Storage', icon: Database },
  { value: 'b2', label: 'Backblaze B2', icon: Database },
  { value: 'sftp', label: 'SFTP', icon: Database },
  { value: 'webdav', label: 'WebDAV', icon: Database },
];

interface RepositoryConnectFormProps {
  onSuccess?: () => void;
  onNeedsCreate?: () => void;
  showCard?: boolean;
}

export function RepositoryConnectForm({
  onSuccess,
  onNeedsCreate,
  showCard = true,
}: RepositoryConnectFormProps) {
  const { isLoading: isConnecting, error: connectError, connect } = useRepository();

  // Step state
  const [step, setStep] = useState<'storage-type' | 'storage-config' | 'password'>('storage-type');

  // Form state
  const [storageType, setStorageType] = useState<StorageType>('filesystem');
  const [path, setPath] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('My Repository');
  const [readonly, setReadonly] = useState(false);

  // Current user info
  const [username, setUsername] = useState('');
  const [hostname, setHostname] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [customHostname, setCustomHostname] = useState('');

  // UI state
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current user on mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setUsername(user.username);
        setHostname(user.hostname);
        setCustomUsername(user.username);
        setCustomHostname(user.hostname);
      } catch (err) {
        console.error('Failed to load current user:', err);
      }
    };

    void loadCurrentUser();
  }, []);

  const handleStorageTypeNext = () => {
    setError(null);
    setStep('storage-config');
  };

  const handleStorageConfigNext = async () => {
    if (!path) {
      setError('Please enter a storage path');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Check if repository exists at this location
      const exists = await repositoryExists({
        type: storageType,
        path,
      });

      if (exists) {
        // Repository exists, proceed to password step
        setStep('password');
      } else {
        // Should not happen - repositoryExists should throw NOT_INITIALIZED
        setError('Repository not found at this location');
      }
    } catch (err) {
      const message = getErrorMessage(err);

      if (message.includes('NOT_INITIALIZED')) {
        // Repository doesn't exist - suggest creating one
        if (onNeedsCreate) {
          toast.info('No repository found at this location. You need to create one first.');
          onNeedsCreate();
        } else {
          setError(
            'No repository exists at this location. Please create one first or choose a different path.'
          );
        }
      } else {
        setError(message);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('Please enter a password');
      return;
    }

    setError(null);

    const success = await connect({
      storage: {
        type: storageType,
        path,
      },
      password,
      clientOptions: {
        description,
        username: customUsername || username,
        hostname: customHostname || hostname,
        readonly,
      },
    });

    if (success) {
      toast.success('Successfully connected to repository');
      setPassword(''); // Clear password for security
      if (onSuccess) {
        onSuccess();
      }
    } else {
      setError(connectError || 'Failed to connect to repository');
    }
  };

  const renderStorageTypeStep = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Select Storage Type</h3>
        <p className="text-sm text-muted-foreground">Choose where your repository is located</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {storageOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStorageType(option.value as StorageType)}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors text-left ${
              storageType === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <option.icon className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{option.label}</span>
          </button>
        ))}
      </div>

      <Button onClick={handleStorageTypeNext} className="w-full">
        Next
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderStorageConfigStep = () => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleStorageConfigNext();
      }}
      className="space-y-4"
    >
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep('storage-type')}
          className="mb-2"
        >
          ← Back to storage type
        </Button>
        <h3 className="text-lg font-semibold">Storage Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Enter the location of your existing repository
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="path" className="text-sm">
          Repository Path <span className="text-destructive">*</span>
        </Label>
        <Input
          id="path"
          type="text"
          placeholder={
            storageType === 'filesystem' ? '/backup/kopia-repository' : 's3://bucket-name/path'
          }
          value={path}
          onChange={(e) => setPath(e.target.value)}
          required
          className="font-mono text-sm"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          {storageType === 'filesystem'
            ? 'Path to the directory containing your repository'
            : 'Remote path where your repository is stored'}
        </p>
      </div>

      <Button type="submit" disabled={isVerifying} className="w-full">
        {isVerifying ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Verifying...
          </>
        ) : (
          <>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );

  const renderPasswordStep = () => (
    <form onSubmit={(e) => void handleConnect(e)} className="space-y-4">
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep('storage-config')}
          className="mb-2"
        >
          ← Back to configuration
        </Button>
        <h3 className="text-lg font-semibold">Connect to Repository</h3>
        <p className="text-sm text-muted-foreground">Enter your repository password to connect</p>
      </div>

      {(error || connectError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || connectError}</AlertDescription>
        </Alert>
      )}

      {/* Current User Display */}
      <div className="space-y-2">
        <Label className="text-sm">Connect As</Label>
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">
            {username}@{hostname}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">To override, expand Advanced Options below</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm">
          Repository Password <span className="text-destructive">*</span>
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter repository password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Note:</strong> Password recovery is impossible. Ensure you have it stored
            securely!
          </AlertDescription>
        </Alert>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm">
          Repository Description
        </Label>
        <Input
          id="description"
          type="text"
          placeholder="My Repository"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Helps distinguish between multiple repositories
        </p>
      </div>

      {/* Advanced Options */}
      <Accordion type="single" collapsible>
        <AccordionItem value="advanced">
          <AccordionTrigger className="text-sm">Advanced Options</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="readonly"
                checked={readonly}
                onCheckedChange={(checked) => setReadonly(checked as boolean)}
              />
              <Label htmlFor="readonly" className="text-sm font-normal cursor-pointer">
                Connect in read-only mode
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Read-only mode prevents any changes to the repository
            </p>

            <div className="space-y-2">
              <Label htmlFor="custom-username" className="text-sm">
                Override Username
              </Label>
              <Input
                id="custom-username"
                type="text"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use when restoring snapshots from another user
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-hostname" className="text-sm">
                Override Hostname
              </Label>
              <Input
                id="custom-hostname"
                type="text"
                value={customHostname}
                onChange={(e) => setCustomHostname(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use when restoring snapshots from another machine
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button type="submit" disabled={isConnecting} className="w-full">
        {isConnecting ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Connecting...
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            Connect to Repository
          </>
        )}
      </Button>
    </form>
  );

  const formContent = (
    <div className="space-y-4">
      {step === 'storage-type' && renderStorageTypeStep()}
      {step === 'storage-config' && renderStorageConfigStep()}
      {step === 'password' && renderPasswordStep()}
    </div>
  );

  if (!showCard) {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Connect to Repository</CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
