import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Card, CardContent } from './ui/card'

const testimonials = [
  { quote: 'This starter made our UI shine in hours, not weeks.', author: 'Ava M.' },
  { quote: 'Beautiful defaults and superb DX. Highly recommend.', author: 'Noah K.' },
  { quote: 'The animations are smooth and tasteful out of the box.', author: 'Liam S.' },
]

export function Testimonials() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % testimonials.length), 3500)
    return () => clearInterval(id)
  }, [])

  return (
    <section id="testimonials" className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="relative h-40 md:h-28">
          <AnimatePresence mode="wait">
            <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }} className="absolute inset-0">
              <Card className="h-full flex items-center justify-center">
                <CardContent>
                  <p className="text-lg md:text-xl">“{testimonials[index].quote}”</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">— {testimonials[index].author}</p>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}


