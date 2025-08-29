import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from './ui/input'
import { Button } from './ui/button'

const schema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Enter a valid email'),
  message: z.string().min(10, 'Tell us a bit more'),
})

type FormValues = z.infer<typeof schema>

export function ContactForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function onSubmit(values: FormValues) {
    console.log('contact', values)
    reset()
  }

  return (
    <section id="contact" className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
          <div>
            <label className="text-sm">Name</label>
            <Input placeholder="Your name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm">Email</label>
            <Input placeholder="you@example.com" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-sm">Message</label>
            <textarea className="min-h-28 flex w-full rounded-md border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="How can we help?" {...register('message')} />
            {errors.message && <p className="text-sm text-red-500 mt-1">{errors.message.message}</p>}
          </div>
          <div className="flex justify-end">
            <Button disabled={isSubmitting} type="submit">Send</Button>
          </div>
        </form>
      </div>
    </section>
  )
}


