import { useConnector, useAccount, useCluster } from '@solana/connector/react';

export function WalletDemo() {
    const { wallets, select, disconnect, connected, connecting } = useConnector();
    const { formatted } = useAccount();
    const { cluster } = useCluster();

    return (
        <div className="py-12">
            <div className="max-w-2xl mx-auto px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">ConnectorKit Vite Example</h1>
                    <p className="text-gray-600">Demonstrating Solana wallet connection with Vite + React</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Connection Status</h2>

                    {!connected ? (
                        <div>
                            <p className="text-gray-600 mb-4">Not connected</p>
                            <div className="space-y-2">
                                {wallets?.map(wallet => (
                                    <button
                                        key={wallet.wallet.name}
                                        onClick={() => select(wallet.wallet.name)}
                                        disabled={connecting}
                                        className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center space-x-3"
                                    >
                                        {wallet.wallet.icon && (
                                            <img
                                                src={wallet.wallet.icon}
                                                alt={wallet.wallet.name}
                                                className="w-6 h-6"
                                            />
                                        )}
                                        <span>{wallet.wallet.name}</span>
                                        {!wallet.installed && (
                                            <span className="text-xs text-gray-500">(Not Installed)</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-green-600 font-medium mb-2">✅ Connected</p>
                            <p className="text-sm text-gray-600 mb-2">Address: {formatted}</p>
                            <p className="text-sm text-gray-600 mb-4">Network: {String(cluster || 'unknown')}</p>
                            <button
                                onClick={() => disconnect()}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                Disconnect
                            </button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-xl font-semibold mb-4">Available Wallets</h2>
                    <div className="grid gap-3">
                        {wallets?.map(wallet => (
                            <div
                                key={wallet.wallet.name}
                                className="flex items-center justify-between p-3 border rounded-lg"
                            >
                                <div className="flex items-center space-x-3">
                                    {wallet.wallet.icon && (
                                        <img src={wallet.wallet.icon} alt={wallet.wallet.name} className="w-6 h-6" />
                                    )}
                                    <span className="font-medium">{wallet.wallet.name}</span>
                                </div>
                                <span
                                    className={`text-xs px-2 py-1 rounded ${
                                        wallet.installed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                    }`}
                                >
                                    {wallet.installed ? 'Installed' : 'Not Installed'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
