'use client';

import React, { useEffect, useState } from 'react';
import { AlignLeft, ArrowUp, Github, Bug } from 'lucide-react';

export interface TocItem {
  id: string;
  title: string;
  level?: 2 | 3;
}

interface DocsTableOfContentsProps {
  items: TocItem[];
  githubEditPath?: string;
}

export default function DocsTableOfContents({
  items,
  githubEditPath,
}: DocsTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (items.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      let currentActive = items[0]?.id || '';

      for (const item of items) {
        const element = document.getElementById(item.id);
        if (element) {
          const top = element.offsetTop;
          if (scrollPosition >= top) {
            currentActive = item.id;
          }
        }
      }

      setActiveId(currentActive);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [items]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const elem = document.getElementById(id);
    if (elem) {
      const topOffset = 85;
      const elementPosition = elem.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveId(id);
      window.history.pushState(null, '', `#${id}`);
    }
  };

  if (!items || items.length === 0) {
    return null;
  }

  const editUrl = githubEditPath
    ? `https://github.com/Maffioo/kinecode/edit/main/landing/app/docs/${githubEditPath}`
    : 'https://github.com/Maffioo/kinecode';

  return (
    <aside className="w-full space-y-6 text-xs text-slate-400">
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
          <AlignLeft className="w-3.5 h-3.5 text-brand-cyan" />
          <span>On this page</span>
        </div>

        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => scrollToSection(item.id, e)}
                className={`block py-1 text-xs transition-colors leading-relaxed ${
                  item.level === 3 ? 'pl-4 text-[11px]' : 'pl-0'
                } ${
                  isActive
                    ? 'text-brand-cyan font-semibold translate-x-1 transition-transform'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.title}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-dark-800 space-y-2 font-sans text-xs">
        <a
          href={editUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Github className="w-3.5 h-3.5" />
          <span>Edit this page on GitHub</span>
        </a>

        <a
          href="https://github.com/Maffioo/kinecode/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Bug className="w-3.5 h-3.5" />
          <span>Report an issue</span>
        </a>

        <button
          onClick={scrollToTop}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors pt-1"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>Scroll to top</span>
        </button>
      </div>
    </aside>
  );
}
