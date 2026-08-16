'use server';

import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Fighter from '@/models/Fighter';
import { getCurrentUser } from '@/app/actions/authActions';
import { revalidatePath } from 'next/cache';

export async function getEvents() {
  try {
    await dbConnect();
    const events = await Event.find({})
      .populate({
        path: 'comments.fighter',
        select: 'name',
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      events: events.map((e) => ({
        ...e,
        _id: e._id.toString(),
        date: e.date.toISOString(),
        rsvps: e.rsvps.map((id) => id.toString()),
        likes: e.likes ? e.likes.map((id) => id.toString()) : [],
        comments: e.comments ? e.comments.map((c) => ({
          _id: c._id.toString(),
          text: c.text,
          createdAt: c.createdAt ? c.createdAt.toISOString() : null,
          fighterId: c.fighter ? (c.fighter._id ? c.fighter._id.toString() : c.fighter.toString()) : null,
          fighterName: c.fighter ? c.fighter.name : 'Unknown Athlete',
        })) : [],
        createdAt: e.createdAt ? e.createdAt.toISOString() : null,
        updatedAt: e.updatedAt ? e.updatedAt.toISOString() : null,
      })),
    };
  } catch (err) {
    console.error('Error fetching events:', err);
    return { error: 'Failed to fetch events' };
  }
}

export async function createEvent(prevState, formData) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'MainAdmin' && user.role !== 'Coach')) {
      return { error: 'Unauthorized' };
    }

    const title = formData.get('title')?.trim();
    const description = formData.get('description')?.trim();
    const dateStr = formData.get('date');
    const location = formData.get('location')?.trim();
    const category = formData.get('category');
    const image = formData.get('image');
    const audio = formData.get('audio');

    if (!title || !description || !dateStr || !category) {
      return { error: 'Please fill in all required fields.' };
    }

    console.log('--- server actions: createEvent ---');
    console.log('title:', title);
    console.log('image size (chars):', image ? image.length : 0);
    console.log('audio size (chars):', audio ? audio.length : 0);

    await Event.create({
      title,
      description,
      date: new Date(dateStr),
      location,
      category,
      rsvps: [],
      image: image || undefined,
      audio: audio || undefined,
    });

    revalidatePath('/admin/events');
    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error creating event:', err);
    return { error: 'Failed to create event.' };
  }
}

export async function deleteEvent(eventId) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'MainAdmin' && user.role !== 'Coach')) {
      return { error: 'Unauthorized' };
    }

    await Event.findByIdAndDelete(eventId);

    revalidatePath('/admin/events');
    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error deleting event:', err);
    return { error: 'Failed to delete event.' };
  }
}

export async function toggleEventRSVP(eventId) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || user.role !== 'Fighter') {
      return { error: 'Unauthorized. Only athletes can RSVP.' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { error: 'Event not found.' };
    }

    const fighterId = user.id;
    const hasRSVP = event.rsvps.some((id) => id.toString() === fighterId);

    if (hasRSVP) {
      // Remove RSVP
      event.rsvps = event.rsvps.filter((id) => id.toString() !== fighterId);
    } else {
      // Add RSVP
      event.rsvps.push(fighterId);
    }

    await event.save();

    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error toggling RSVP:', err);
    return { error: 'Failed to update RSVP.' };
  }
}

export async function toggleEventLike(eventId) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || user.role !== 'Fighter') {
      return { error: 'Unauthorized' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { error: 'Event not found.' };
    }

    const fighterId = user.id;
    const hasLiked = event.likes.some((id) => id.toString() === fighterId);

    if (hasLiked) {
      event.likes = event.likes.filter((id) => id.toString() !== fighterId);
    } else {
      event.likes.push(fighterId);
    }

    await event.save();

    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error toggling like:', err);
    return { error: 'Failed to update like.' };
  }
}

export async function addEventComment(eventId, text) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || user.role !== 'Fighter') {
      return { error: 'Unauthorized' };
    }

    if (!text || text.trim() === '') {
      return { error: 'Comment text cannot be empty.' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { error: 'Event not found.' };
    }

    event.comments.push({
      fighter: user.id,
      text: text.trim(),
    });

    await event.save();

    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error adding comment:', err);
    return { error: 'Failed to post comment.' };
  }
}

export async function updateEvent(eventId, formData) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'MainAdmin' && user.role !== 'Coach')) {
      return { error: 'Unauthorized' };
    }

    const title = formData.get('title')?.trim();
    const description = formData.get('description')?.trim();
    const dateStr = formData.get('date');
    const location = formData.get('location')?.trim();
    const category = formData.get('category');
    const image = formData.get('image');
    const audio = formData.get('audio');

    if (!title || !description || !dateStr || !category) {
      return { error: 'Please fill in all required fields.' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { error: 'Event not found.' };
    }

    event.title = title;
    event.description = description;
    event.date = new Date(dateStr);
    event.location = location;
    event.category = category;
    
    // Only update if provided or explicitly cleared
    event.image = image || undefined;
    event.audio = audio || undefined;

    await event.save();

    revalidatePath('/admin/events');
    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error updating event:', err);
    return { error: 'Failed to update event.' };
  }
}
