import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { youtubeApi } from '../../services/api';

export const Ipv6Toggle: React.FC = () => {
  const [forceIpv6, setForceIpv6] = useState<boolean | null>(null);

  useEffect(() => {
    youtubeApi.getSettings().then((s) => setForceIpv6(s.forceIpv6)).catch(() => {});
  }, []);

  if (forceIpv6 === null) return null;

  const toggle = async () => {
    const next = !forceIpv6;
    setForceIpv6(next); // optimistic
    try {
      await youtubeApi.updateSettings({ forceIpv6: next });
    } catch {
      setForceIpv6(!next);
      toast.error('Failed to update setting');
    }
  };

  return (
    <label
      className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer"
      title="Turn off when using a VPN without IPv6"
    >
      Force IPv6
      <button
        type="button"
        role="switch"
        aria-checked={forceIpv6}
        onClick={toggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          forceIpv6 ? 'bg-primary-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            forceIpv6 ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
};
