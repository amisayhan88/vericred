import React from 'react';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';

const footerLinks: Record<string, Array<{ label: string; href: string; external?: boolean }>> = {
  Product: [
    { label: 'Issue Credentials', href: '/issue' },
    { label: 'Verify ZK Proofs', href: '/verify' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Analytics', href: '/analytics' },
  ],
  Protocol: [
    { label: 'Compact Contracts', href: '/help' },
    { label: 'Zero-Knowledge Circuits', href: '/help' },
    { label: 'Privacy Model', href: '/help' },
    { label: 'Midnight Network', href: 'https://midnight.network', external: true },
  ],
  Resources: [
    { label: 'Help Center', href: '/help' },
    { label: 'Activity Feed', href: '/activity' },
    { label: 'Transactions', href: '/transactions' },
    { label: 'Settings', href: '/settings' },
  ],
  Explore: [
    { label: 'Preprod Explorer', href: 'https://preprod.midnightexplorer.com', external: true },
    { label: 'Subscan', href: 'https://midnight-preprod.subscan.io', external: true },
    { label: '1am Explorer', href: 'https://explorer.1am.xyz', external: true },
    { label: 'GitHub', href: 'https://github.com/amisayhan88/DV-portal', external: true },
  ],
};

export const Footer: React.FC = () => {
  return (
    <footer className="bg-surface-dark text-on-dark-soft" style={{ padding: '64px 24px' }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Top: Logo + Description */}
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-12">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-on-dark flex items-center justify-center">
                <Award className="w-4 h-4 text-surface-dark" />
              </div>
              <span className="text-title-md font-semibold text-on-dark tracking-tight">
                VeriCred
              </span>
            </Link>
            <p className="text-body-sm text-on-dark-soft leading-relaxed">
              Privacy-first confidential academic credentials platform built on the Midnight Network.
              Zero-knowledge proofs for selective disclosure.
            </p>
          </div>

          {/* Link Columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-body-sm font-semibold text-on-dark mb-3">{category}</h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-body-sm text-on-dark-soft hover:text-on-dark transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className="text-body-sm text-on-dark-soft hover:text-on-dark transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Divider + Copyright */}
        <div className="border-t border-surface-dark-elevated pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-caption text-on-dark-soft">
            © {new Date().getFullYear()} VeriCred Protocol. Built on Midnight Network.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-caption text-on-dark-soft">Preprod Testnet Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
