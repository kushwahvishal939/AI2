import { motion } from 'framer-motion'
import { Code2, Sparkles, Shield, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

const items = [
  { icon: Sparkles, title: 'Elegant UI', desc: 'Minimal, refined components that look great out of the box.' },
  { icon: Code2, title: 'Type Safe', desc: 'Built with TypeScript and best practices for reliability.' },
  { icon: Zap, title: 'Animations', desc: 'Smooth transitions and motion using Framer Motion.' },
  { icon: Shield, title: 'Accessible', desc: 'Semantic markup and keyboard friendly by default.' },
]

export function Features() {
  return (
    <section id="features" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((it, idx) => (
            <motion.div key={it.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05 }}>
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <it.icon className="h-5 w-5 text-blue-600" />
                    <CardTitle>{it.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 dark:text-gray-300">{it.desc}</CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}


