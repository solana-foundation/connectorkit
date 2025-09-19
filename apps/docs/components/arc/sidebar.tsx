'use client'

import * as Base from 'fumadocs-core/sidebar'
import { 
  Menu, 
  X, 
  Book, 
  Plug, 
  Settings, 
  Home, 
  Zap, 
  Layers,
  FileText,
  Code,
  Wrench,
  File,
  GripVertical,
  Download,
  Play,
  Palette,
  TestTube,
  Compass,
  Rocket,
  Component,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { type PageTree } from 'fumadocs-core/server'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import logoArc from '@/app/(home)/assets/logo-arc.png'
import { CopyButton } from '@/components/ui/copy-button'

interface ArcSidebarProps {
  tree: PageTree.Root
}

// Helper function to check if an item is deprecated
function isDeprecated(name: string) {
  const nameToCheck = name.toLowerCase()
  return (
    name.includes('@solana/') ||
    nameToCheck.includes('use-wallet-adapters') ||
    nameToCheck.includes('use-wallet') && !nameToCheck.includes('use-wallet-address')
  )
}

// Deprecated badge component
function DeprecatedBadge() {
  return (
    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
      <AlertTriangle className="h-2.5 w-2.5" />
      <span className="font-medium">DEPRECATED</span>
    </div>
  )
}

// Helper function to get icon for pages based on name
function getPageIcon(pageName: string) {
  const name = pageName.toLowerCase()
  
  // Specific page icons
  if (name.includes('intro') || name.includes('getting') || name.includes('start')) return Home
  if (name.includes('install') || name.includes('setup')) return Download  
  if (name.includes('customization') || name.includes('theme') || name.includes('style')) return Palette
  if (name.includes('try') || name.includes('demo') || name.includes('example')) return Play
  if (name.includes('hook') || name.includes('api')) return Code
  if (name.includes('component')) return Component
  if (name.includes('test') || name.includes('testing')) return TestTube
  if (name.includes('guide') || name.includes('tutorial')) return Compass
  if (name.includes('deploy') || name.includes('launch')) return Rocket
  if (name.includes('provider') || name.includes('config')) return Settings
  if (name.includes('util') || name.includes('helper')) return Wrench
  
  // Default icon for other pages
  return GripVertical
}

// Helper function to check if folder should have an icon (only sub-folders, not major sections)
function shouldShowFolderIcon(folderName: string, depth: number) {
  const name = folderName.toLowerCase()
  
  // Don't show icons for major top-level sections
  if (depth === 0 && (
    name.includes('connector') || 
    name.includes('solana') || 
    name.includes('provider')
  )) {
    return false
  }
  
  return true
}

function getFolderIcon(folderName: string) {
  const name = folderName.toLowerCase()
  
  if (name.includes('component') || name.includes('ui')) return Layers
  if (name.includes('hook') || name.includes('api')) return Code
  if (name.includes('guide') || name.includes('tutorial')) return Book
  if (name.includes('util') || name.includes('helper')) return Wrench
  if (name.includes('config') || name.includes('setup')) return Settings
  
  // Default icon for other folders
  return FileText
}

export function ArcSidebar({ tree }: ArcSidebarProps) {
  const pathname = usePathname()

  return (
    <Base.SidebarProvider>
      {/* Mobile trigger */}
      <Base.SidebarTrigger className="fixed top-4 left-4 z-50 md:hidden">
        <div className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm">
          <Menu className="h-5 w-5" />
        </div>
      </Base.SidebarTrigger>

      {/* Sidebar content */}
      <Base.SidebarList className={cn(
        // Base styles
        "fixed inset-y-0 left-0 z-40 w-80 flex flex-col",
        "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-r border-gray-200 dark:border-gray-800",
        "transform transition-transform duration-300 ease-in-out",
        // Mobile hide by default
        "md:translate-x-0 -translate-x-full",
        // Open state (controlled by data-open)
        "data-[open=true]:translate-x-0"
      )}>
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
            <div className="relative bg-primary/5 overflow-hidden p-6 
                       shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),inset_0_-4px_30px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.05)]
                       dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-4px_30px_rgba(47,44,48,0.9),0_4px_16px_rgba(0,0,0,0.6)]">
          
          {/* Background Pattern - FIRST (behind everything) */}
          <div className="absolute inset-0 opacity-5 z-[-1]"
            style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, black 1px, transparent 2px),
                radial-gradient(circle at 75% 75%, black 1px, transparent 2px)
              `,
              backgroundSize: "24px 24px",
            }}
          />
          {/* Close button for mobile */}
          <div className="flex justify-end mb-4 md:hidden">
            <Base.SidebarTrigger>
              <X className="h-5 w-5" />
            </Base.SidebarTrigger>
          </div>
          
          <Link href="/docs" className="flex flex-col items-left gap-2">
            <Image
              src={logoArc}
              alt="Arc Logo"
              width={120}
              height={120}
              className="w-[120px] h-[120px]"
            />
          </Link>
          <div className="flex flex-col text-left space-y-2">
            <div className="flex items-end gap-2 justify-left">
                 <span className="text-2xl font-bold text-zinc-900 dark:text-white">ARC</span>
                 <div className="text-xs text-zinc-500 dark:text-zinc-400 translate-y-[-2px] p-1 py-0.5 border border-zinc-300 dark:border-zinc-800 rounded-md font-mono">0.0.0</div>
               </div>
               <span className="text-[16px] text-zinc-500 dark:text-zinc-400 leading-tight">A modular type-safe SDK that simplifies building modern <br />Solana applications.</span>
               
               {/* NPM Install Copy Button */}
               <div className="hidden w-full mt-4 pt-2">
                 <CopyButton
                   textToCopy="npm install @connectorkit/hooks"
                   displayText="npm install @connectorkit/hooks"
                   className="w-full text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-zinc-300 shadow-sm dark:border-zinc-800 px-3 py-2 rounded-lg transition-all duration-150 ease-in-out active:scale-[0.98] hover:cursor-pointer"
                   iconClassName="h-3 w-3"
                   iconClassNameCheck="h-3 w-3"
                 />
               </div>
             </div>
          </div>
        </div>

        {/* Navigation content */}
        <div className="flex-1 overflow-y-auto p-6">
          <nav className="space-y-2">
            {tree.children.map((node, index) => (
              <NavigationNode key={`${node.name}-${index}`} node={node} pathname={pathname} />
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="hidden sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
              <span className="text-xs font-mono">v</span>
            </div>
            <span>Version 0.1.0</span>
          </div>
        </div>
      </Base.SidebarList>


    </Base.SidebarProvider>
  )
}

interface NavigationNodeProps {
  node: PageTree.Node
  pathname: string
  depth?: number
}

function NavigationNode({ node, pathname, depth = 0 }: NavigationNodeProps) {
  // Handle separator nodes
  if (node.type === 'separator') {
    return <hr className="my-4 border-gray-200 dark:border-gray-800" />
  }

  const nodeUrl = node.type === 'page' ? node.url : node.type === 'folder' ? node.index?.url : undefined
  const isActive = pathname === nodeUrl

  if (node.type === 'page') {
    const pageName = typeof node.name === 'string' ? node.name : String(node.name || '')
    const PageIconComponent = getPageIcon(pageName)
    const deprecated = isDeprecated(pageName)
    
    return (
      <div className="space-y-1">
        <Link
          href={node.url}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm transition-all duration-150 hover:text-zinc-900 dark:hover:text-zinc-100",
            depth > 0 && "ml-4",
            isActive && [
              "border-l-2 border-transparent text-zinc-900 dark:text-zinc-100",
              "border-l-2 border-zinc-200 dark:border-zinc-800 pl-2"
            ],
            !isActive && "text-gray-400 dark:text-gray-300"
          )}
        >
          <PageIconComponent className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span className={cn("truncate", deprecated && "line-through")}>
            {node.name}
          </span>
        </Link>
        {deprecated && (
          <div className={cn("flex justify-start", depth > 0 && "ml-4", "ml-3")}>
            <DeprecatedBadge />
          </div>
        )}
      </div>
    )
  }

  if (node.type === 'folder') {
    const hasChildren = node.children.length > 0
    const folderName = typeof node.name === 'string' ? node.name : String(node.name || '')
    const showIcon = shouldShowFolderIcon(folderName, depth)
    const IconComponent = getFolderIcon(folderName)
    const deprecated = isDeprecated(folderName)
    
    return (
      <div className="space-y-2">
        {/* Folder heading */}
        <div className="space-y-1">
          {node.index ? (
            <Link
              href={node.index.url}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
                "hover:bg-gray-100 dark:hover:bg-gray-800",
                depth > 0 && "ml-4",
                isActive && [
                  "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",
                  "border-l-2 border-blue-500 dark:border-blue-400 pl-2"
                ],
                !isActive && "text-gray-800 dark:text-gray-200"
              )}
            >
              {showIcon && <IconComponent className="h-4 w-4 shrink-0" />}
              <span className={cn("truncate", deprecated && "line-through")}>
                {node.name}
              </span>
            </Link>
          ) : (
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-semibold",
              depth > 0 && "ml-4",
              "text-gray-800 dark:text-gray-200"
            )}>
              {showIcon && <IconComponent className="h-4 w-4 shrink-0" />}
              <span className={cn("truncate", deprecated && "line-through")}>
                {node.name}
              </span>
            </div>
          )}
          {deprecated && (
            <div className={cn("flex justify-start", depth > 0 && "ml-4", "ml-3")}>
              <DeprecatedBadge />
            </div>
          )}
        </div>
        
        {/* Always show children */}
        {hasChildren && (
          <div className="space-y-1">
            {node.children.map((child, index) => (
              <NavigationNode
                key={`${child.name}-${index}`}
                node={child}
                pathname={pathname}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}
