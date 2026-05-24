import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../../context/auth-context'
import { positionService } from '../position/position-service'
import { PositionForm } from '../position/position-form'
import type { PositionSummary } from '../position/position-types'
import type { RestorePositionPayload } from '../position/position-types'
import { AppNav } from '../../shared/app-nav'
import { Modal } from '../../shared/modal'
import { companyService } from './company-service'
import type { CompanyEmployee, CompanyHiringRecord, CompanySummary } from './company-types'

const formatPositionTerm = (position: PositionSummary) => {
  const from = new Date(position.neededFrom).toLocaleDateString('uk-UA')
  if (position.isOpenEndedTerm) {
    return `Потрібно: з ${from}, невизначений термін`
  }

  if (!position.neededTo) {
    return `Потрібно: з ${from}`
  }

  const to = new Date(position.neededTo).toLocaleDateString('uk-UA')
  return `Потрібно: ${from} - ${to}`
}

interface RestoreDateFormProps {
  position: PositionSummary
  onSubmit: (payload: RestorePositionPayload) => Promise<boolean>
  isLoading: boolean
}

const RestoreDateForm = ({ position, onSubmit, isLoading }: RestoreDateFormProps) => {
  const [neededFrom, setNeededFrom] = useState(() => new Date().toISOString().split('T')[0])
  const [neededTo, setNeededTo] = useState('')
  const [isOpenEndedTerm, setIsOpenEndedTerm] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    const ok = await onSubmit({
      neededFrom,
      neededTo: isOpenEndedTerm ? undefined : neededTo || undefined,
      isOpenEndedTerm,
    })
    if (!ok) setFormError('Не вдалося відновити позицію')
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <p className="text-sm text-slate-600">
        Відновити позицію <span className="font-semibold">{position.title}</span> ({position.seniority}) з новими датами.
      </p>

      {formError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
      ) : null}

      <label className="block space-y-1">
        <span className="text-sm text-slate-600">Потрібно з</span>
        <input
          type="date"
          className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
          value={neededFrom}
          onChange={(e) => setNeededFrom(e.target.value)}
          disabled={isLoading}
          required
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isOpenEndedTerm}
          onChange={(e) => setIsOpenEndedTerm(e.target.checked)}
          disabled={isLoading}
          className="rounded"
        />
        <span className="text-sm text-slate-600">Безстроково</span>
      </label>

      {!isOpenEndedTerm ? (
        <label className="block space-y-1">
          <span className="text-sm text-slate-600">Потрібно до</span>
          <input
            type="date"
            className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
            value={neededTo}
            onChange={(e) => setNeededTo(e.target.value)}
            disabled={isLoading}
            required
          />
        </label>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-300"
      >
        {isLoading ? 'Відновлюємо...' : 'Відновити позицію'}
      </button>
    </form>
  )
}

export const CompanyDetailPage = () => {
  const { authData } = useAuth()
  const navigate = useNavigate()
  const { companyId } = useParams<{ companyId: string }>()
  const { role } = authData!.user

  const [company, setCompany] = useState<CompanySummary | null>(null)
  const [positions, setPositions] = useState<PositionSummary[]>([])
  const [employees, setEmployees] = useState<CompanyEmployee[]>([])
  const [hiringHistory, setHiringHistory] = useState<CompanyHiringRecord[]>([])
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreatingPosition, setIsCreatingPosition] = useState(false)
  const [isUpdatingPosition, setIsUpdatingPosition] = useState(false)
  const [isRestoringPosition, setIsRestoringPosition] = useState(false)
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false)
  const [isEditPositionModalOpen, setIsEditPositionModalOpen] = useState(false)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<PositionSummary | null>(null)
  const [restoringPosition, setRestoringPosition] = useState<PositionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const accessToken = authData!.tokens.accessToken

  const loadData = useCallback(async () => {
    if (!companyId) return

    setError(null)
    setIsLoading(true)
    try {
      const [companyResult, positionsResult, employeesResult, historyResult] = await Promise.all([
        role === 'manager'
          ? companyService.getById(companyId, accessToken)
          : companyService.getMineById(companyId, accessToken),
        positionService.listByCompany(companyId, accessToken),
        companyService.getEmployees(companyId, accessToken),
        companyService.getHistory(companyId, accessToken),
      ])

      setCompany(companyResult.company)
      setName(companyResult.company.name)
      setWebsite(companyResult.company.website ?? '')
      setIndustry(companyResult.company.industry ?? '')
      setDescription(companyResult.company.description ?? '')
      setPositions(positionsResult.positions)
      setEmployees(employeesResult.employees)
      setHiringHistory(historyResult.history)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка завантаження компанії')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, accessToken, role])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!companyId) return

    setError(null)
    setIsSaving(true)
    try {
      const response = await companyService.updateMineById(
        companyId,
        {
          name: name.trim() || undefined,
          website: website.trim() || undefined,
          industry: industry.trim() || undefined,
          description: description.trim() || undefined,
        },
        accessToken,
      )
      setCompany(response.company)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка збереження')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreatePosition = async (
    payload: Parameters<typeof positionService.create>[0],
  ): Promise<boolean> => {
    setError(null)
    setIsCreatingPosition(true)

    try {
      const result = await positionService.create(payload, accessToken)
      setPositions((previous) => [result.position, ...previous])
      setIsPositionModalOpen(false)
      return true
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка створення позиції')
      return false
    } finally {
      setIsCreatingPosition(false)
    }
  }

  const handleOpenEditPosition = (position: PositionSummary) => {
    setEditingPosition(position)
    setIsEditPositionModalOpen(true)
  }

  const handleUpdatePosition = async (
    payload: Parameters<typeof positionService.update>[1],
  ): Promise<boolean> => {
    if (!editingPosition) {
      return false
    }

    setError(null)
    setIsUpdatingPosition(true)
    try {
      const result = await positionService.update(editingPosition.id, payload, accessToken)
      setPositions((previous) =>
        previous.map((position) =>
          position.id === editingPosition.id ? result.position : position,
        ),
      )
      setIsEditPositionModalOpen(false)
      setEditingPosition(null)
      return true
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка оновлення позиції')
      return false
    } finally {
      setIsUpdatingPosition(false)
    }
  }

  const handleOpenRestorePosition = (position: PositionSummary) => {
    setRestoringPosition(position)
    setIsRestoreModalOpen(true)
  }

  const handleRestorePosition = async (payload: RestorePositionPayload): Promise<boolean> => {
    if (!restoringPosition) return false

    setError(null)
    setIsRestoringPosition(true)
    try {
      const result = await positionService.restore(restoringPosition.id, payload, accessToken)
      setPositions((previous) =>
        previous.map((position) =>
          position.id === restoringPosition.id ? result.position : position,
        ),
      )
      setIsRestoreModalOpen(false)
      setRestoringPosition(null)
      return true
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка відновлення позиції')
      return false
    } finally {
      setIsRestoringPosition(false)
    }
  }

  const positionsCountText = useMemo(() => {
    const active = positions.filter((p) => p.status !== 'archived').length
    if (active === 0) return 'Поки позицій немає'
    return `Позицій: ${active}`
  }, [positions])

  const backPath = role === 'manager' ? '/companies/all' : '/companies'
  const isReadOnly = role === 'manager'

  if (!companyId) {
    return <Navigate to="/companies" replace />
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.22),_transparent_40%),linear-gradient(145deg,_#f8fafc_0%,_#e2e8f0_100%)] px-6 py-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <AppNav
          title={company ? company.name : 'Компанія'}
          actions={
            <>
              <button
                type="button"
                onClick={() => void navigate(backPath)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Назад до списку
              </button>
              {!isReadOnly ? (
                <button
                  type="button"
                  onClick={() => setIsPositionModalOpen(true)}
                  className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  + Додати позицію
                </button>
              ) : null}
            </>
          }
        />

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Інформація про компанію</h2>
            <p className="text-sm text-slate-500">
              {isReadOnly ? 'Детальна інформація про компанію та її актуальні позиції.' : 'Редагуйте дані компанії і збережіть зміни.'}
            </p>

            {isReadOnly ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Назва компанії</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{company?.name ?? '—'}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Власник</p>
                    <p className="mt-1 text-sm text-slate-900">{company?.ownerName ?? '—'}</p>
                    {company?.ownerEmail ? <p className="text-sm text-slate-600">{company.ownerEmail}</p> : null}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Галузь</p>
                    <p className="mt-1 text-sm text-slate-900">{company?.industry || 'Не вказано'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Вебсайт</p>
                  {company?.website ? (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-sky-600 hover:underline">
                      {company.website}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">Не вказано</p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Опис</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{company?.description || 'Опис відсутній'}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">Назва компанії</span>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
                    placeholder="Acme Corp"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={isSaving || isLoading}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">Вебсайт</span>
                  <input
                    type="url"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
                    placeholder="https://example.com"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    disabled={isSaving || isLoading}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">Галузь</span>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
                    placeholder="FinTech / Healthcare / E-commerce"
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                    disabled={isSaving || isLoading}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">Опис</span>
                  <textarea
                    rows={5}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
                    placeholder="Коротко опишіть компанію"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={isSaving || isLoading}
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSaving || isLoading}
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-300"
                >
                  {isSaving ? 'Зберігаємо...' : 'Зберегти зміни'}
                </button>
              </form>
            )}
          </section>

          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-900">Позиції компанії</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                {positionsCountText}
              </span>
            </div>

            {isLoading ? (
              <p className="text-sm text-slate-500">Завантажуємо позиції...</p>
            ) : positions.filter((p) => p.status !== 'archived').length === 0 ? (
              <p className="text-sm text-slate-500">Додайте першу позицію через кнопку вище.</p>
            ) : (
              <ul className="space-y-3">
                {positions
                  .filter((p) => p.status !== 'archived')
                  .map((position) => (
                    <li
                      key={position.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{position.title}</p>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                          {position.seniority}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{position.stack.join(', ')}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatPositionTerm(position)}</p>
                      {!isReadOnly ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEditPosition(position)}
                          className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Редагувати
                        </button>
                      ) : null}
                    </li>
                  ))}
              </ul>
            )}

            {positions.some((p) => p.status === 'archived') ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Архівовані позиції</p>
                <ul className="space-y-2">
                  {positions
                    .filter((p) => p.status === 'archived')
                    .map((position) => (
                      <li
                        key={position.id}
                        className="rounded-2xl border border-amber-100 bg-amber-50 p-4 opacity-80"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-700">{position.title}</p>
                          <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs text-amber-700">
                            {position.seniority}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">{position.stack.join(', ')}</p>
                        {!isReadOnly ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRestorePosition(position)}
                            className="mt-3 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                          >
                            Відновити
                          </button>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        {}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Співробітники</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {employees.length === 0 ? 'Немає співробітників' : `Всього: ${employees.length}`}
            </span>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Завантажуємо співробітників...</p>
          ) : employees.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Поки жодного затвердженого бронювання — тут з'являться прив'язані кандидати.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {employees.map((employee) => (
                <li
                  key={employee.bookingId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <Link
                    to={`/masters/${employee.candidateId}`}
                    className="font-semibold text-sky-600 hover:underline"
                  >
                    {employee.candidateName}
                  </Link>
                  <p className="mt-1 text-sm text-slate-700">
                    {employee.positionTitle}
                    {employee.positionSeniority ? ` · ${employee.positionSeniority}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(employee.requestedFrom).toLocaleDateString('uk-UA')}
                    {' — '}
                    {new Date(employee.requestedTo).toLocaleDateString('uk-UA')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Архів найму</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {hiringHistory.length === 0 ? 'Порожньо' : `Записів: ${hiringHistory.length}`}
            </span>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">Завантажуємо історію...</p>
          ) : hiringHistory.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Історія найму з'явиться, коли термін роботи співробітника закінчиться.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hiringHistory.map((record) => (
                <li
                  key={record.bookingId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 opacity-80"
                >
                  <Link
                    to={`/masters/${record.candidateId}`}
                    className="font-semibold text-slate-700 hover:underline"
                  >
                    {record.candidateName}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">
                    {record.positionTitle}
                    {record.positionSeniority ? ` · ${record.positionSeniority}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(record.requestedFrom).toLocaleDateString('uk-UA')}
                    {' — '}
                    {new Date(record.requestedTo).toLocaleDateString('uk-UA')}
                  </p>
                  <span className="mt-2 inline-block rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-500">
                    Завершено
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!isReadOnly ? (
          <>
            <Modal
              isOpen={isPositionModalOpen}
              onClose={() => setIsPositionModalOpen(false)}
              title="Додати позицію"
            >
              <PositionForm
                companyId={companyId}
                onSubmit={handleCreatePosition}
                isLoading={isCreatingPosition}
              />
            </Modal>

            <Modal
              isOpen={isEditPositionModalOpen}
              onClose={() => {
                setIsEditPositionModalOpen(false)
                setEditingPosition(null)
              }}
              title="Редагувати позицію"
            >
              {editingPosition ? (
                <PositionForm
                  key={editingPosition.id}
                  companyId={companyId}
                  onSubmit={handleUpdatePosition}
                  isLoading={isUpdatingPosition}
                  submitLabel="Зберегти позицію"
                  initialPosition={editingPosition}
                />
              ) : null}
            </Modal>

            <Modal
              isOpen={isRestoreModalOpen}
              onClose={() => {
                setIsRestoreModalOpen(false)
                setRestoringPosition(null)
              }}
              title="Відновити позицію"
            >
              {restoringPosition ? (
                <RestoreDateForm
                  key={restoringPosition.id}
                  position={restoringPosition}
                  onSubmit={handleRestorePosition}
                  isLoading={isRestoringPosition}
                />
              ) : null}
            </Modal>
          </>
        ) : null}
      </section>
    </main>
  )
}
