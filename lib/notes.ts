import { supabase } from './supabase'
import { getCurrentUserId } from './auth'

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  reminder_date: string | null
  reminder_sent: boolean
  tags: string[]
  pinned: boolean
  created_at: string
  updated_at: string
}

export async function getNotes(): Promise<Note[]> {
  const userId = getCurrentUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get notes error:', error)
    return []
  }

  return data || []
}

export async function addNote(
  title: string,
  content: string,
  reminderDate?: string,
  tags?: string[]
): Promise<Note | null> {
  const userId = getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      title,
      content,
      reminder_date: reminderDate || null,
      tags: tags || [],
      pinned: false
    } as any)
    .select()
    .single()

  if (error) {
    console.error('Add note error:', error)
    return null
  }

  return data
}

export async function updateNote(
  noteId: string,
  updates: Partial<Note>
): Promise<boolean> {
  const { error } = await (supabase
    .from('notes') as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', noteId)

  if (error) {
    console.error('Update note error:', error)
    return false
  }

  return true
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    console.error('Delete note error:', error)
    return false
  }

  return true
}

export async function togglePinNote(noteId: string, pinned: boolean): Promise<boolean> {
  return updateNote(noteId, { pinned })
}
