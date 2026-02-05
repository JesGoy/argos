"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionData } from "@/core/application/ports/SessionService";
import { logoutAction } from "@/app/(dashboard)/logout/actions";

type NavItem = {
  key: string;
  label: string;
  href: string;
  description: string;
  roles: SessionData["role"][];
  icon: JSX.Element;
};

const NAV_ITEMS: NavItem[] = [
  {
    key: "products",
    label: "Productos",
    href: "/products",
    description: "Gestión de catálogo y stock",
    roles: ["admin", "warehouse_manager", "operator", "viewer"],
    icon: (
      <svg
        aria-hidden
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.5 7.5 12 3l8.5 4.5M3.5 7.5V16L12 21l8.5-5V7.5M12 21V13"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="m20.5 7.5-8.5 4.5-8.5-4.5" />
      </svg>
    ),
  },
  {
    key: "ai-assistant",
    label: "Asistente IA",
    href: "/ai-assistant",
    description: "Panel conversacional",
    roles: ["admin", "warehouse_manager", "operator", "viewer"],
    icon: (
      <svg
        aria-hidden
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3c-3 0-5.5 2.5-5.5 5.5S9 14 12 14s5.5-2.5 5.5-5.5S15 3 12 3ZM5.5 14.5 3 21l6.5-2.5M18.5 14.5 21 21l-6.5-2.5M9.5 8.5h5"
        />
      </svg>
    ),
  },
];

const ROLE_LABEL: Record<SessionData["role"], string> = {
  admin: "Administrador",
  warehouse_manager: "Jefe de almacén",
  operator: "Operador",
  viewer: "Visor",
};

function NavLinks({
  items,
  pathname,
  onNavigate,
  collapsed = false,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center ${collapsed ? 'justify-center gap-0' : 'gap-3'} rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-200 hover:bg-white/10 hover:text-white"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                isActive
                  ? "border-blue-100 bg-blue-50 text-blue-700"
                  : "border-white/10 bg-white/5 text-white"
              }`}
            >
              {item.icon}
            </span>
            {!collapsed && (
              <div className="flex flex-col text-left">
                <span className="font-semibold leading-tight ">{item.label}</span>
                <span className="text-xs text-gray-500 hover:text-gray-white">

                  {item.description}
                </span>
              </div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileModal({
  open,
  onClose,
  session,
  allowedItems,
}: {
  open: boolean;
  onClose: () => void;
  session: SessionData;
  allowedItems: NavItem[];
}) {
  if (!open) return null;

  const initials = (session.username || session.email || "?").slice(0, 2).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <p className="text-sm text-gray-500">Perfil</p>
            <h2 className="text-xl font-semibold text-gray-900">{session.username}</h2>
            <p className="text-sm text-gray-600">{session.email}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
            {initials}
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500">Rol</p>
            <p className="text-sm font-medium text-gray-900">{ROLE_LABEL[session.role]}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Acceso habilitado
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {allowedItems.map((item) => (
                <div
                  key={item.key}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cerrar
          </button>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function DashboardNav({ session }: { session: SessionData }) {
  const pathname = usePathname();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);

  const allowedItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.roles.includes(session.role)),
    [session.role]
  );

  const initials = (session.username || session.email || "?").slice(0, 1).toUpperCase();

  return (
    <>
      <aside
        className={`relative hidden h-screen ${isCollapsed ? 'w-20' : 'w-72'} shrink-0 flex-col border-r border-gray-200 bg-gradient-to-b from-slate-900 to-slate-800 px-5 py-6 text-white shadow-lg transition-all duration-200 md:flex`}
      >
        <div className="flex flex-1 flex-col justify-between gap-6">
          <div className="space-y-6">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-base font-semibold">
                A
              </div>
              {!isCollapsed && (
                <div>
                  <p className="text-sm text-gray-200">Bienvenido</p>
                  <p className="text-lg font-semibold leading-tight">{session.username}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {!isCollapsed && (
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-100">
                  <span>Navegación</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-gray-100">
                    {ROLE_LABEL[session.role]}
                  </span>
                </div>
              )}
              <NavLinks items={allowedItems} pathname={pathname} collapsed={isCollapsed} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className={`group flex items-center ${isCollapsed ? 'justify-center gap-0' : 'gap-3'} rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-blue-200/60 hover:bg-white/10`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
              {initials}
            </div>
            {!isCollapsed && (
              <div className="flex-1">
                <p className="text-sm font-semibold leading-tight">{session.username}</p>
                <p className="text-xs text-gray-300">Ver perfil y sesión</p>
              </div>
            )}
            {!isCollapsed && (
              <svg
                aria-hidden
                className="h-4 w-4 text-gray-300 transition group-hover:text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="absolute -right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-800 text-gray-100 shadow-lg transition hover:border-white/40 hover:bg-slate-700 hover:text-white"
          aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          aria-pressed={isCollapsed}
        >
          <svg
            aria-hidden
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 5-7 7 7 7" />
            )}
          </svg>
        </button>
      </aside>

      <div className="md:hidden">
        <div className="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm"
              aria-label="Abrir menú"
            >
              <svg
                aria-hidden
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div>
              <p className="text-sm text-gray-500">Argos</p>
              <p className="text-base font-semibold text-gray-900">{session.username}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
            aria-label="Perfil"
          >
            {initials}
          </button>
        </div>

        {isMobileOpen && (
          <div className="fixed inset-0 z-40 flex">
            <div className="w-72 bg-gradient-to-b from-slate-900 to-slate-800 px-5 py-6 text-white shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-300">Menú</p>
                  <p className="text-sm font-semibold">{session.username}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/10 p-2"
                  aria-label="Cerrar menú"
                >
                  <svg
                    aria-hidden
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              </div>
              <NavLinks
                items={allowedItems}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(true);
                  setMobileOpen(false);
                }}
                className="mt-6 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm font-medium text-white"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                  {initials}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-tight">{session.username}</p>
                  <p className="text-xs text-gray-300">Ver perfil y sesión</p>
                </div>
              </button>
            </div>
            <div
              className="flex-1 bg-black/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
          </div>
        )}
      </div>

      <ProfileModal
        open={isProfileOpen}
        onClose={() => setProfileOpen(false)}
        session={session}
        allowedItems={allowedItems}
      />
    </>
  );
}
