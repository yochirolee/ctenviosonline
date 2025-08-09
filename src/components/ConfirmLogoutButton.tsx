"use client"

import { useState } from "react"
import { Dialog } from "@headlessui/react"
import type { Dict } from "@/types/Dict"

type Props = {
  logout: () => Promise<void>
  dict?: Dict
}

export default function ConfirmLogoutButton({ logout, dict }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  // ✅ Usando solo claves dentro de "common"
  const t = {
    title: dict?.common?.confirm_logout_title ?? "Log out?",
    msg: dict?.common?.confirm_logout_message ?? "You will need to log in again to continue.",
    cancel: dict?.common?.cancel ?? "Cancel",
    confirm: dict?.common?.logout ?? "Log out",
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-red-600 transition"
        aria-label={t.confirm}
      >
        {t.confirm}
      </button>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <Dialog.Title className="text-lg font-bold">{t.title}</Dialog.Title>
            <p className="mt-2 text-sm text-gray-600">{t.msg}</p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout()
                  setIsOpen(false)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                {t.confirm}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  )
}
