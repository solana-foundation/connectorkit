'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDown, LogOut, Plus, Wallet as WalletIcon } from 'lucide-react'
import { useArcClient } from '@connector-kit/sdk'
import { Button } from './ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from './ui/dropdown-menu'

interface Props {
	children: React.ReactNode
}

interface Wallet {
	name: string
	icon: string
}

export function ConnectWalletMenu({ children }: Props) {
	const { wallet, select, disconnect, selectAccount } = useArcClient()
	const [forceClose, setForceClose] = useState(false)

	const wallets = (wallet.wallets ?? []).filter((w: any): w is Wallet => {
	  return w && typeof w.name === 'string' && typeof w.icon === 'string'
	})
	const accounts = wallet.accounts ?? []
	const selectedAddress = wallet.address

	const selectedDisplay = useMemo(() => {
		if (!selectedAddress) return null
		return `${String(selectedAddress).slice(0, 8)}...`
	}, [selectedAddress])

	return (
		<DropdownMenu open={forceClose ? false : undefined} onOpenChange={() => setForceClose(false)}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="flex items-center gap-2 px-3 py-2 h-10">
					{selectedDisplay ? (
						<>
							<span className="font-mono text-sm">{selectedDisplay}</span>
							<ChevronDown className="h-4 w-4 opacity-60" />
						</>
					) : (
						<>
							<WalletIcon className="h-4 w-4" />
							{children}
							<ChevronDown className="h-4 w-4 opacity-60" />
						</>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				{wallets.length === 0 ? (
					<div className="p-4 text-center text-sm text-muted-foreground">No wallets found</div>
				) : (
					<div className="p-1">
						{!selectedAddress && (
							<div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b mb-1">
								Available Wallets
							</div>
						)}
						{wallets.map((w: Wallet) => {
							const isSelectedWallet = wallet.selectedWallet?.name === w.name
							return (
								<DropdownMenuSub key={w.name} open={isSelectedWallet ? undefined : false}>
								<DropdownMenuSubTrigger
									className="flex items-center justify-between w-full px-2 py-2 text-sm rounded-md hover:bg-accent focus:bg-accent"
								onClick={
									!selectedAddress
										? async () => {
											try {
												await select?.(w.name)
												setForceClose(true)
											} catch (error) {
												console.error('Failed to select wallet:', error)
											}
										}
										: undefined
								}
								>
									<div className="flex items-center gap-3">
										<img src={w.icon} width={20} height={20} className="rounded-full" alt={w.name} />
										<span className="text-sm font-medium truncate">{w.name}</span>
									</div>
								</DropdownMenuSubTrigger>
																	<DropdownMenuSubContent className="w-64">
										<DropdownMenuLabel className="px-2 py-1.5">Accounts ({accounts.length})</DropdownMenuLabel>
										{accounts.length === 0 ? (
											<div className="px-3 py-2 text-xs text-muted-foreground">
												No accounts available
											</div>
										) : (
											accounts.map(a => (
												<DropdownMenuItem
													key={String(a.address)}
													onSelect={async e => {
														e.preventDefault()
														if (selectAccount) await selectAccount(a.address)
														setForceClose(true)
													}}
													className={`px-3 py-2 ${String(a.address) === String(selectedAddress) ? 'bg-accent' : ''}`}
												>
													<div className="flex items-center gap-2">
														{String(a.address) === String(selectedAddress) && (
															<div className="w-2 h-2 rounded-full bg-primary" />
														)}
														<span className="font-mono text-xs">
															{String(a.address).slice(0, 8)}...{String(a.address).slice(-4)}
														</span>
													</div>
												</DropdownMenuItem>
											))
										)}
									<DropdownMenuSeparator />
																		<DropdownMenuItem
										className="flex items-center gap-2 px-3 py-2"
										onSelect={async e => {
											e.preventDefault()
											await select?.(w.name)
											setForceClose(true)
										}}
									>
										<Plus className="h-4 w-4" />
										<span>Connect More</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										className="flex items-center gap-2 px-3 py-2 text-destructive focus:text-destructive"
										onSelect={async e => {
											e.preventDefault()
											await disconnect?.()
											setForceClose(true)
										}}
									>
										<LogOut className="h-4 w-4" />
										<span>Disconnect</span>
									</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuSub>
							)
						})}
					</div>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}


