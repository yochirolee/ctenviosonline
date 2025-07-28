'use client'

import { motion } from 'framer-motion'

type Stat = {
  name: string
  value: string
}

type About = {
  title: string
  description: string
  description2: string
  description3: string
  stats: Stat[]
}

type Dict = {
  about: About
}

type Props = {
  dict: Dict
}

export default function AboutWithStats({ dict }: Props) {
  const about = dict.about
  const stats = about.stats

  return (
    <div id="about" className="relative isolate overflow-visible bg-green-900 py-24 sm:py-32">
      {/* Fondos decorativos (sin cambios) */}
      
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        viewport={{ once: true }}
        className="mx-auto max-w-7xl px-6 lg:px-8"
      >
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-5xl font-semibold tracking-tight text-white sm:text-7xl">{about.title}</h2>
          <p className="mt-8 text-lg font-medium text-left text-green-200 sm:text-xl/8">
            {about.description} <span className="font-semibold text-lime-300">{about.description2}</span> {about.description3}
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-2xl lg:mx-0 lg:max-w-none">
          <dl className="mt-16 grid grid-cols-2 gap-8 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat: Stat) => (
              <div key={stat.name} className="flex flex-col-reverse gap-1">
                <dt className="text-base/7 text-white">{stat.name}</dt>
                <dd className="text-4xl font-semibold tracking-tight text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </motion.div>
    </div>
  )
}
