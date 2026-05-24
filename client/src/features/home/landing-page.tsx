import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../../context/auth-context'

const categoryCards = [
  {
    title: 'Ремонт квартири',
    subtitle: 'Електрика, сантехніка, оздоблення',
    accent: 'from-[#ffdca8] to-[#fff2df]',
  },
  {
    title: 'Будівельні роботи',
    subtitle: 'Фасади, покрівля, мурування',
    accent: 'from-[#b8e3e4] to-[#e7f7f7]',
  },
  {
    title: 'Домашній сервіс',
    subtitle: 'Меблі, дрібний ремонт, догляд',
    accent: 'from-[#f6d6c2] to-[#fff0e7]',
  },
]

export const LandingPage = () => {
  const { authData } = useAuth()

  if (authData) {
    return <Navigate to="/overview" replace />
  }

  return (
    <main className="marketplace-bg px-6 py-10">
      <section className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-[32px] border border-[#dccfb8] bg-[linear-gradient(130deg,_#fff7ea_0%,_#f5ecdd_55%,_#efe7d8_100%)] p-8 shadow-[0_24px_45px_rgba(95,67,43,0.2)] md:p-12">
          <p className="text-sm uppercase tracking-[0.28em] text-[#9a7d55]">Platform for Masters</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-[#1f2a2d] md:text-5xl">
            Платформа, що поєднує клієнтів із перевіреними майстрами за категоріями послуг
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[#5d5348] md:text-lg">
            Створюйте замовлення, знаходьте виконавців, керуйте співпрацею через менеджера платформи та прозорі рейтинги.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16657a]"
            >
              Увійти
            </Link>
            <Link
              to="/register"
              className="rounded-xl border border-[#d9d3c5] bg-[#fffdf8] px-5 py-2.5 text-sm font-semibold text-[#5d5348] transition hover:bg-[#f7efdd]"
            >
              Створити акаунт
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {categoryCards.map((card) => (
            <article
              key={card.title}
              className={`rounded-3xl border border-[#e3d7c5] bg-gradient-to-br ${card.accent} p-5 shadow-sm`}
            >
              <h3 className="text-xl font-semibold text-[#24353a]">{card.title}</h3>
              <p className="mt-2 text-sm text-[#65584c]">{card.subtitle}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-[#e3d7c5] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9a7d55]">Крок 1</p>
            <h3 className="mt-2 text-lg font-semibold text-[#24353a]">Клієнт створює замовлення</h3>
            <p className="mt-2 text-sm text-[#65584c]">Описує категорію, строки і навантаження для робіт.</p>
          </article>
          <article className="rounded-3xl border border-[#e3d7c5] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9a7d55]">Крок 2</p>
            <h3 className="mt-2 text-lg font-semibold text-[#24353a]">Менеджер поєднує сторони</h3>
            <p className="mt-2 text-sm text-[#65584c]">Підбирає майстра, веде статуси й контролює процес.</p>
          </article>
          <article className="rounded-3xl border border-[#e3d7c5] bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9a7d55]">Крок 3</p>
            <h3 className="mt-2 text-lg font-semibold text-[#24353a]">Рейтинг після виконання</h3>
            <p className="mt-2 text-sm text-[#65584c]">Оцінка майстра стає частиною його профілю на платформі.</p>
          </article>
        </section>
      </section>
    </main>
  )
}
