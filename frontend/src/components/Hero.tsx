import { motion } from 'framer-motion'
import { Button } from './ui/button'

export function Hero() {
  return (
    <section className="relative pt-20 pb-16 md:pt-28 md:pb-24">
      <div className="absolute inset-0 -z-10 [background:radial-gradient(40%_40%_at_50%_0%,rgba(37,99,235,0.18),transparent)]" />
      <div className="max-w-6xl mx-auto px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-6xl font-semibold tracking-tight"
        >
          Build delightful UIs faster
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
        >
          A modern React starter with elegant defaults, animations, and beautiful components.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <Button className="">Get Started</Button>
          <Button variant="outline">Learn More</Button>
        </motion.div>
      </div>
    </section>
  )
}


