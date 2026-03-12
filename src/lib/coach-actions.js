import prismaClient from './prisma.js';
import { ensureExerciseCatalog, getExerciseSnapshot, resolveExerciseInput } from './exercise-catalog.js';

function getDayBounds(targetDate) {
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
}

export async function findSessionByDate(prisma = prismaClient, targetDate) {
  const { startOfDay, endOfDay } = getDayBounds(targetDate);
  return prisma.workoutSession.findFirst({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
    },
    include: { sets: true },
  });
}

export async function appendSessionNote(prisma = prismaClient, sessionId, currentNotes, note) {
  return prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      notes: currentNotes ? `${currentNotes}\n${note}` : note,
    },
  });
}

async function handleExerciseUpdate(prisma, session, op) {
  switch (op.type) {
    case 'rename': {
      const setToRename = session.sets.find(
        (set) => set.exerciseName.toLowerCase() === (op.oldName || '').toLowerCase()
      );
      if (!setToRename) return false;

      const resolved = await resolveExerciseInput(prisma, op.newName, { allowCreateCustom: true });
      if (resolved.status !== 'resolved') return false;

      await prisma.workoutSet.update({
        where: { id: setToRename.id },
        data: {
          exerciseId: resolved.exerciseId,
          exerciseName: resolved.canonicalName,
          originalInput: op.newName,
        },
      });
      return true;
    }

    case 'update': {
      const setToUpdate = session.sets.find(
        (set) => set.exerciseName.toLowerCase() === (op.exerciseName || '').toLowerCase()
      );
      if (!setToUpdate) return false;

      const updateFields = {};
      if (op.weight !== undefined) updateFields.weight = parseFloat(op.weight);
      if (op.sets !== undefined) updateFields.sets = parseInt(op.sets, 10);
      if (op.reps !== undefined) updateFields.reps = parseInt(op.reps, 10);
      if (op.newName) {
        const resolved = await resolveExerciseInput(prisma, op.newName, { allowCreateCustom: true });
        if (resolved.status === 'resolved') {
          updateFields.exerciseId = resolved.exerciseId;
          updateFields.exerciseName = resolved.canonicalName;
          updateFields.originalInput = op.newName;
        }
      }

      await prisma.workoutSet.update({
        where: { id: setToUpdate.id },
        data: updateFields,
      });
      return true;
    }

    case 'add': {
      const resolved = await resolveExerciseInput(prisma, op.exerciseName || 'Ejercicio', { allowCreateCustom: true });
      if (resolved.status !== 'resolved') return false;

      await prisma.workoutSet.create({
        data: {
          workoutSessionId: session.id,
          exerciseId: resolved.exerciseId,
          exerciseName: resolved.canonicalName,
          originalInput: op.exerciseName || resolved.canonicalName,
          weight: parseFloat(op.weight) || 0,
          sets: parseInt(op.sets, 10) || 3,
          reps: parseInt(op.reps, 10) || 10,
        },
      });
      return true;
    }

    case 'delete': {
      const setToDelete = session.sets.find(
        (set) => set.exerciseName.toLowerCase() === (op.exerciseName || '').toLowerCase()
      );
      if (!setToDelete) return false;

      await prisma.workoutSet.delete({ where: { id: setToDelete.id } });
      return true;
    }

    default:
      return false;
  }
}

export async function executeCoachAction(prisma = prismaClient, result) {
  await ensureExerciseCatalog(prisma);

  let finalMessage = result.message || 'No tengo respuesta en este momento.';
  const action = result.action || 'CHAT';

  if (action === 'ANSWER_EXERCISE_QUERY') {
    const exerciseQuery = result.exerciseQuery || result.exerciseName || '';
    const snapshot = await getExerciseSnapshot(prisma, exerciseQuery);
    if (!snapshot) {
      return { action, finalMessage: result.message || `No encontre registros para ${exerciseQuery}.` };
    }

    if (snapshot.status === 'ambiguous') {
      return {
        action,
        finalMessage: `Ese ejercicio es ambiguo. Puede ser: ${snapshot.options.map((option) => option.canonicalName).join(', ')}.`,
      };
    }

    if (!snapshot.lastEntry) {
      return {
        action,
        finalMessage: result.message || `Todavia no tienes registros guardados para ${snapshot.canonicalName}.`,
      };
    }

    const lastDate = new Date(snapshot.lastEntry.date).toISOString().slice(0, 10);
    const bestDate = new Date(snapshot.bestEntry.date).toISOString().slice(0, 10);
    return {
      action,
      finalMessage:
        result.message ||
        `${snapshot.canonicalName}: ultimo ${lastDate} hiciste ${snapshot.lastEntry.weight}kg ${snapshot.lastEntry.sets}x${snapshot.lastEntry.reps}. Mejor marca: ${snapshot.bestEntry.weight}kg ${snapshot.bestEntry.sets}x${snapshot.bestEntry.reps} el ${bestDate}.`,
    };
  }

  if (action === 'MOVE_SESSION_DATE') {
    if (!result.targetDate || !result.newDate) {
      return { action, finalMessage: 'Faltan fechas para mover la sesion.' };
    }

    const existingSession = await findSessionByDate(prisma, result.targetDate);
    if (!existingSession) {
      return { action, finalMessage: `No encontre una sesion registrada para el ${result.targetDate}.` };
    }

    const destinationSession = await findSessionByDate(prisma, result.newDate);
    if (destinationSession && destinationSession.id !== existingSession.id) {
      return { action, finalMessage: `Ya existe una sesion registrada para el ${result.newDate}.` };
    }

    const destinationDate = new Date(result.newDate);
    destinationDate.setHours(
      existingSession.date.getHours(),
      existingSession.date.getMinutes(),
      existingSession.date.getSeconds(),
      existingSession.date.getMilliseconds()
    );

    const reason = result.reason || result.updates?.correctionReason || 'Cambio de fecha solicitado al coach';

    await prisma.workoutSession.update({
      where: { id: existingSession.id },
      data: {
        date: destinationDate,
        notes: existingSession.notes
          ? `${existingSession.notes}\n[AI: ${reason}]`
          : `[AI: ${reason}]`,
      },
    });

    return {
      action,
      finalMessage: result.message || `Movi la sesion del ${result.targetDate} al ${result.newDate}.`,
    };
  }

  if (!result.targetDate || !['UPDATE_SESSION', 'DELETE_SESSION', 'UPDATE_EXERCISES'].includes(action)) {
    return { action, finalMessage };
  }

  const existingSession = await findSessionByDate(prisma, result.targetDate);
  if (!existingSession) {
    return { action, finalMessage: `No encontre una sesion registrada para el ${result.targetDate}.` };
  }

  if (action === 'DELETE_SESSION') {
    await prisma.workoutSession.delete({ where: { id: existingSession.id } });
    return { action, finalMessage };
  }

  if (action === 'UPDATE_SESSION') {
    const updateData = {};
    const updates = result.updates || {};

    if (updates.muscleGroup !== undefined) updateData.muscleGroup = updates.muscleGroup;
    if (updates.didCardio !== undefined) updateData.didCardio = updates.didCardio;
    if (updates.cardioType !== undefined) updateData.cardioType = updates.cardioType;
    if (updates.cardioMinutes !== undefined) updateData.cardioMinutes = updates.cardioMinutes;
    if (updates.totalCalories !== undefined) updateData.totalCalories = updates.totalCalories;
    if (updates.durationMinutes !== undefined) updateData.durationMinutes = updates.durationMinutes;
    if (updates.fatigueLevel !== undefined) updateData.fatigueLevel = updates.fatigueLevel;
    if (updates.nitRating !== undefined) updateData.nitRating = updates.nitRating;
    if (updates.feeling !== undefined) updateData.feeling = updates.feeling;

    const note = `[AI: ${updates.correctionReason || 'Correccion manual'}]`;
    updateData.notes = existingSession.notes ? `${existingSession.notes}\n${note}` : note;

    await prisma.workoutSession.update({
      where: { id: existingSession.id },
      data: updateData,
    });

    return { action, finalMessage };
  }

  if (action === 'UPDATE_EXERCISES') {
    const operations = result.exerciseUpdates || [];
    for (const op of operations) {
      await handleExerciseUpdate(prisma, existingSession, op);
    }

    const note = `[AI: Ejercicios modificados - ${operations.map((op) => op.type).join(', ')}]`;
    await appendSessionNote(prisma, existingSession.id, existingSession.notes, note);
    return { action, finalMessage };
  }

  return { action, finalMessage };
}
