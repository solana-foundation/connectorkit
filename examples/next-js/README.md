# ConnectorKit React Example

Production-ready Solana wallet connection components built with shadcn/ui and Next.js. These components are designed to be copied into your project and customized to match your needs.

## 🚀 Quick Start

```bash
# From repo root
pnpm install

# Run the example
cd examples/react
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the components in action.

## 📦 What's Included

### Components

All components are located in `components/connector/`:

#### **ConnectButton**

A fully-featured wallet connection button with dropdown menu.

**Features:**

- Opens wallet selection modal on click
- Shows wallet avatar and truncated address when connected
- Dropdown menu with copy address and disconnect actions
- Loading states during connection
- Fully styled with shadcn/ui components

**Usage:**

```tsx
import { ConnectButton } from '@/components/connector';

export default function Header() {
    return <ConnectButton />;
}
```

#### **WalletModal**

A dialog for selecting and connecting to Solana wallets.

**Features:**

- Lists all available Solana wallets
- Shows wallet icons and names
- Detects installed vs. not installed wallets
- Provides installation links for popular wallets
- Handles connection errors gracefully
- Clean, accessible UI with shadcn Dialog

**Usage:**

```tsx
import { WalletModal } from "@/components/connector"

const [open, setOpen] = useState(false)

<WalletModal open={open} onOpenChange={setOpen} />
```

#### **AccountSwitcher**

A dropdown for switching between multiple wallet accounts.

**Features:**

- Automatically hidden when only one account
- Dropdown menu showing all accounts
- Visual indicator for active account
- Truncated addresses for better UX
- Seamless account switching

**Usage:**

```tsx
import { AccountSwitcher } from '@/components/connector';

export default function Header() {
    return <AccountSwitcher />;
}
```

#### **ClusterSelector**

A dropdown for switching between Solana networks.

**Features:**

- Supports Mainnet, Devnet, Testnet, and Localnet
- Color-coded badges for each network
- Persists selection across sessions
- Shows current network clearly
- Visual indicator for active cluster

**Usage:**

```tsx
import { ClusterSelector } from '@/components/connector';

export default function Header() {
    return <ClusterSelector />;
}
```

## 🎨 Customization

These components are meant to be **copied and customized**:

1. **Copy** the component files from `components/connector/` to your project
2. **Customize** the styling by modifying Tailwind classes
3. **Extend** functionality by adding your own features
4. **Replace** icons or add animations as needed

### Example: Custom Styling

```tsx
// Change button colors
<ConnectButton className="bg-purple-500 hover:bg-purple-600" />

// Adjust dropdown position
<AccountSwitcher className="ml-auto" />
```

## 📋 Dependencies

These components use:

- `@solana/connector` - Headless wallet connection logic
- `shadcn/ui` - UI components (Button, Dialog, Dropdown, etc.)
- `lucide-react` - Icons
- `tailwindcss` - Styling

## 🏗️ Project Structure

```
components/
├── connector/
│   ├── connect-button.tsx      # Main connection button
│   ├── wallet-modal.tsx         # Wallet selection dialog
│   ├── account-switcher.tsx     # Account switching dropdown
│   ├── cluster-selector.tsx     # Network selection dropdown
│   └── index.ts                 # Barrel exports
└── ui/                          # shadcn/ui base components
    ├── button.tsx
    ├── dialog.tsx
    ├── dropdown-menu.tsx
    └── ...
```

## 🔧 How to Use in Your Project

### Option 1: Copy Components

1. Install dependencies:

    ```bash
    npm install @solana/connector
    npx shadcn@latest init
    npx shadcn@latest add button dialog dropdown-menu avatar badge card
    ```

2. Copy components:

    ```bash
    cp -r components/connector your-project/components/
    ```

3. Use in your app:
    ```tsx
    import { ConnectButton } from '@/components/connector';
    ```

### Option 2: Build Your Own

Use these components as reference to build your own custom implementation:

- Study how hooks are used (`useConnector`, `useAccount`, `useCluster`)
- Adapt the UI patterns to your design system
- Add custom features specific to your use case

## 🎯 Example Implementation

See `app/page.tsx` for a complete example showing:

- Header with all components
- Connection status display
- Wallet information cards
- Network and account details
- Component documentation

## 🚢 Production Tips

- **Error Handling**: Add toast notifications for connection errors
- **Analytics**: Track wallet connections and network changes
- **Accessibility**: Components use semantic HTML and ARIA labels
- **Performance**: Components use React best practices (memoization, etc.)
- **Mobile**: Test on mobile devices and adjust as needed

## 📚 Learn More

- [ConnectorKit Documentation](../../README.md)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Connector Package](../../packages/connector)

## 💡 Tips

- **Combine Components**: Use ConnectButton, AccountSwitcher, and ClusterSelector together in your header
- **Conditional Rendering**: AccountSwitcher automatically hides when not needed
- **Persistence**: ClusterSelector remembers the selected network across sessions
- **Styling**: All components accept `className` prop for easy customization

## 🤝 Contributing

These examples are meant to inspire and educate. Feel free to:

- Fork and customize for your needs
- Share improvements or variations
- Report issues or suggest features

---

Built with ❤️ using ConnectorKit, Next.js, and shadcn/ui
