import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../../context/auth-context'
import { AppNav } from '../../shared/app-nav'
import { skillService } from './skill-service'
import type { SkillSummary } from './skill-types'

export const SkillsPage = () => {
  const { authData } = useAuth()
  const accessToken = authData!.tokens.accessToken
  const { role } = authData!.user

  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const loadSkills = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await skillService.list(accessToken)
      setSkills(response.skills)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка завантаження навичок')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadSkills()
  }, [loadSkills])

  const handleCreate = async () => {
    const name = newSkillName.trim()
    if (!name) {
      return
    }

    setError(null)
    setIsSaving(true)
    try {
      const response = await skillService.create({ name }, accessToken)
      setSkills((prev) => [...prev, response.skill].sort((a, b) => a.name.localeCompare(b.name)))
      setNewSkillName('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка створення навички')
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (skill: SkillSummary) => {
    setEditingSkillId(skill.id)
    setEditingName(skill.name)
  }

  const cancelEdit = () => {
    setEditingSkillId(null)
    setEditingName('')
  }

  const handleUpdate = async () => {
    if (!editingSkillId) {
      return
    }

    const name = editingName.trim()
    if (!name) {
      return
    }

    setError(null)
    setIsSaving(true)
    try {
      const response = await skillService.update(editingSkillId, { name }, accessToken)
      setSkills((prev) =>
        prev
          .map((item) => (item.id === editingSkillId ? response.skill : item))
          .sort((a, b) => a.name.localeCompare(b.name)),
      )
      cancelEdit()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка оновлення навички')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (skillId: string) => {
    setError(null)
    setIsSaving(true)
    try {
      await skillService.remove(skillId, accessToken)
      setSkills((prev) => prev.filter((item) => item.id !== skillId))
      if (editingSkillId === skillId) {
        cancelEdit()
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка видалення навички')
    } finally {
      setIsSaving(false)
    }
  }

  if (role !== 'manager') {
    return <Navigate to="/masters" replace />
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.22),_transparent_40%),linear-gradient(145deg,_#f8fafc_0%,_#e2e8f0_100%)] px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-6">
        <AppNav title="База навичок" />

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Керування навичками</h2>
          <p className="text-sm text-slate-500">Цей список використовується при створенні/редагуванні позицій.</p>

          <div className="flex flex-wrap gap-2">
            <input
              value={newSkillName}
              onChange={(event) => setNewSkillName(event.target.value)}
              placeholder="Наприклад: React"
              className="w-full max-w-md rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
              disabled={isSaving}
            />
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={isSaving}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              Додати навичку
            </button>
            <button
              type="button"
              onClick={() => void loadSkills()}
              disabled={isLoading}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Оновити
            </button>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Пошук навичок..."
            className="w-full max-w-md rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
          />

          {isLoading ? (
            <p className="text-sm text-slate-500">Завантажуємо список навичок...</p>
          ) : skills.length === 0 ? (
            <p className="text-sm text-slate-500">Список навичок порожній.</p>
          ) : (
            <ul className="space-y-2">
              {skills.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <p className="text-sm text-slate-500">Навичок за запитом «{search}» не знайдено.</p>
              ) : null}
              {skills.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())).map((skill) => (
                <li key={skill.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  {editingSkillId === skill.id ? (
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none ring-sky-300 transition focus:ring"
                      disabled={isSaving}
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-800">{skill.name}</span>
                  )}

                  <div className="flex items-center gap-2">
                    {editingSkillId === skill.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleUpdate()}
                          disabled={isSaving}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
                        >
                          Зберегти
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          Скасувати
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(skill)}
                          disabled={isSaving}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          Редагувати
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(skill.id)}
                          disabled={isSaving}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Видалити
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  )
}
