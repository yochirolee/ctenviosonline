'use client'

type Stat = { name: string; value: string }
type About = {
  title: string
  description: string
  description2: string
  description3: string
  stats: Stat[]
}
type Dict = { about: About }
type Props = { dict: Dict }

export default function AboutWithStats({ dict }: Props) {
  const { about } = dict

  return (
    <div id="about" className="relative isolate bg-green-900 py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            {about.title}
          </h2>

          <p className="mt-3 text-base sm:text-lg leading-relaxed text-green-100">
            {about.description}{' '}
            <span className="font-semibold text-green-600">{about.description2}</span>{' '}
            {about.description3}
          </p>
        </div>

        <div className="mx-auto mt-8 sm:mt-10 max-w-3xl lg:max-w-5xl">
          <dl className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {about.stats.map((stat) => (
              <div
                key={stat.name}
                className="rounded-xl bg-white/5 border border-white/10 p-3 sm:p-4"
              >
                <dd className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  {stat.value}
                </dd>
                <dt className="mt-1 text-xs sm:text-sm uppercase tracking-wide text-green-200/90">
                  {stat.name}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
