import { useEffect, useState } from 'react'

import { FilterCheckboxList } from '../../shared/filter-checkbox-list'
import type { CandidateSummary, CreateCandidatePayload } from './candidate-types'

interface CandidateFormProps {
  onSubmit: (payload: CreateCandidatePayload) => Promise<boolean>
  isLoading: boolean
  canCreate: boolean
  submitLabel?: string
  initialCandidate?: CandidateSummary
  skillOptions?: string[]
}

const todayDate = () => new Date().toISOString().slice(0, 10)
const MAX_CV_FILE_SIZE_BYTES = 7 * 1024 * 1024

export const CandidateForm = ({
  onSubmit,
  isLoading,
  canCreate,
  submitLabel = 'Створити кандидата',
  initialCandidate,
  skillOptions = [],
}: CandidateFormProps) => {
  const [fullName, setFullName] = useState('')
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>()
  const [resumeText, setResumeText] = useState('')
  const [cvPdfDataUrl, setCvPdfDataUrl] = useState<string | undefined>()
  const [skills, setSkills] = useState<string[]>([])
  const [availableFrom, setAvailableFrom] = useState(todayDate())
  const [availableTo, setAvailableTo] = useState('')
  const [isOpenEndedAvailability, setIsOpenEndedAvailability] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialCandidate) {
      return
    }

    setFullName(initialCandidate.fullName)
    setAvatarDataUrl(initialCandidate.avatarDataUrl)
    setResumeText(initialCandidate.resumeText ?? '')
    setCvPdfDataUrl(initialCandidate.cvPdfDataUrl)
    setSkills(initialCandidate.skills)
    setAvailableFrom(new Date(initialCandidate.availableFrom).toISOString().slice(0, 10))
    setAvailableTo(
      initialCandidate.availableTo
        ? new Date(initialCandidate.availableTo).toISOString().slice(0, 10)
        : '',
    )
    setIsOpenEndedAvailability(initialCandidate.isOpenEndedAvailability)
    setFormError(null)
  }, [initialCandidate])

  const toggleSkill = (skill: string) => {
    setSkills((previous) =>
      previous.includes(skill) ? previous.filter((s) => s !== skill) : [...previous, skill],
    )
  }

  const removeSkill = (skillToRemove: string) => {
    setSkills((previous) => previous.filter((skill) => skill !== skillToRemove))
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setAvatarDataUrl(undefined)
      return
    }

    if (!file.type.startsWith('image/')) {
      setFormError('Для аватара потрібно вибрати файл зображення')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFormError(null)
      setAvatarDataUrl(typeof reader.result === 'string' ? reader.result : undefined)
    }
    reader.onerror = () => {
      setFormError('Не вдалося прочитати зображення')
    }
    reader.readAsDataURL(file)
  }

  const handleCvChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setCvPdfDataUrl(undefined)
      return
    }

    if (file.type !== 'application/pdf') {
      setFormError('Для CV потрібно вибрати файл у форматі PDF')
      event.target.value = ''
      return
    }

    if (file.size > MAX_CV_FILE_SIZE_BYTES) {
      setFormError('PDF завеликий. Максимальний розмір файлу: 7MB')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setFormError(null)
      setCvPdfDataUrl(typeof reader.result === 'string' ? reader.result : undefined)
    }
    reader.onerror = () => {
      setFormError('Не вдалося прочитати PDF файл')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)

    if (!skills.length) {
      setFormError('Додайте хоча б одну навичку через кнопку +')
      return
    }

    if (!isOpenEndedAvailability && !availableTo) {
      setFormError('Вкажіть дату завершення або виберіть невизначений термін')
      return
    }

    const isCreated = await onSubmit({
      fullName,
      avatarDataUrl,
      resumeText: resumeText.trim() || undefined,
      cvPdfDataUrl,
      skills,
      availableFrom,
      availableTo: isOpenEndedAvailability ? undefined : availableTo,
      isOpenEndedAvailability,
    })

    if (isCreated) {
      if (!initialCandidate) {
        setFullName('')
        setAvatarDataUrl(undefined)
        setResumeText('')
        setCvPdfDataUrl(undefined)
        setSkills([])
        setAvailableFrom(todayDate())
        setAvailableTo('')
        setIsOpenEndedAvailability(false)
      }
      setFormError(null)
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-slate-600">ПІБ кандидата</span>
        <input
          required
          minLength={2}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
          placeholder="Іван Петренко"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          disabled={!canCreate || isLoading}
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm text-slate-600">Аватар кандидата</span>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="Попередній перегляд аватара" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-slate-400">Без фото</span>
            )}
          </div>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={!canCreate || isLoading}
              className="block text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
            />
            {avatarDataUrl ? (
              <button
                type="button"
                onClick={() => setAvatarDataUrl(undefined)}
                disabled={!canCreate || isLoading}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100"
              >
                Видалити зображення
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm text-slate-600">Готовий працювати з</span>
          <input
            required
            type="date"
            className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
            value={availableFrom}
            onChange={(event) => setAvailableFrom(event.target.value)}
            disabled={!canCreate || isLoading}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-600">Готовий працювати до</span>
          <input
            type="date"
            className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring disabled:bg-slate-100"
            value={availableTo}
            onChange={(event) => setAvailableTo(event.target.value)}
            disabled={!canCreate || isLoading || isOpenEndedAvailability}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isOpenEndedAvailability}
          onChange={(event) => {
            const nextValue = event.target.checked
            setIsOpenEndedAvailability(nextValue)
            if (nextValue) {
              setAvailableTo('')
            }
          }}
          disabled={!canCreate || isLoading}
        />
        Невизначений термін
      </label>
        </div>

        <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-sm text-slate-600">Навички</span>

        {skillOptions.length > 0 ? (
          <FilterCheckboxList
            title="Навички"
            panel={false}
            options={skillOptions.map((s) => ({ value: s, label: s }))}
            selected={new Set(skills)}
            onToggle={toggleSkill}
            searchPlaceholder="Пошук навичок..."
            disabled={!canCreate || isLoading}
          />
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            База навичок порожня. Спочатку додайте навички у розділі «База навичок».
          </p>
        )}

        {skills.length ? (
          <ul className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li
                key={skill}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  disabled={!canCreate || isLoading}
                  className="ml-1 text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
                  aria-label={`Видалити ${skill}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Жодної навички не обрано</p>
        )}
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-slate-600">Резюме (текст)</span>
        <textarea
          rows={3}
          maxLength={10000}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none ring-sky-300 transition focus:ring disabled:bg-slate-100"
          placeholder="Короткий опис досвіду, навичок та досягнень кандидата..."
          value={resumeText}
          onChange={(event) => setResumeText(event.target.value)}
          disabled={!canCreate || isLoading}
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm text-slate-600">CV у форматі PDF</span>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleCvChange}
            disabled={!canCreate || isLoading}
            className="block text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
          />
          {cvPdfDataUrl ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-emerald-600">✓ PDF прикріплено</span>
              <button
                type="button"
                onClick={() => setCvPdfDataUrl(undefined)}
                disabled={!canCreate || isLoading}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-100"
              >
                Видалити PDF
              </button>
            </div>
          ) : null}
        </div>
      </div>
        </div>
      </div>

      {formError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
      ) : null}

      <button
        type="submit"
        disabled={!canCreate || isLoading}
        className="w-full rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
      >
        {isLoading ? 'Зберігаємо...' : submitLabel}
      </button>
    </form>
  )
}
