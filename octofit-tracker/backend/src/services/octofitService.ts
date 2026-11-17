import { isObjectIdOrHexString } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null ||
      !('userId' in input) || !('teamId' in input) ||
      !('type' in input) || !('minutes' in input)) {
    throw Object.assign(new Error('userId, teamId, type, and minutes are required'), { status: 400 });
  }
  const { userId, teamId, type, minutes } = input;
  if (typeof userId !== 'string' || !isObjectIdOrHexString(userId) ||
      typeof teamId !== 'string' || !isObjectIdOrHexString(teamId) ||
      typeof type !== 'string' || type.trim().length === 0 ||
      typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Valid user and team IDs, a non-empty type, and positive finite minutes are required'), { status: 400 });
  }
  const [user, team] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!user || !team) {
    throw Object.assign(new Error('User or team not found'), { status: 404 });
  }
  return Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null ||
      !('name' in input) || !('mascot' in input)) {
    throw Object.assign(new Error('name and mascot are required'), { status: 400 });
  }
  const { name, mascot } = input;
  const members = 'members' in input ? input.members : [];
  if (typeof name !== 'string' || name.trim().length === 0 ||
      typeof mascot !== 'string' || mascot.trim().length === 0 ||
      !Array.isArray(members) ||
      !members.every((member) => typeof member === 'string' && isObjectIdOrHexString(member))) {
    throw Object.assign(new Error('A non-empty name and mascot and an array of valid member IDs are required'), { status: 400 });
  }
  const uniqueMembers = [...new Set(members.map((member) => member.toLowerCase()))];
  if (uniqueMembers.length > 0 &&
      await User.countDocuments({ _id: { $in: uniqueMembers } }) !== uniqueMembers.length) {
    throw Object.assign(new Error('Member not found'), { status: 404 });
  }
  return Team.create({ name, mascot, members });
}

export async function getLeaderboard() {
  const teams = await Activity.aggregate<{ teamName: string; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $lookup: { from: Team.collection.name, localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $sort: { totalPoints: -1, 'team.name': 1, _id: 1 } },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
  ]);
  return teams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  const activity = await Activity.findOne({
    user: user._id,
    type: { $in: ['run', 'cycle', 'strength'] },
  }).sort({ occurredAt: -1, _id: -1 }).lean();
  const focus = activity
    ? (activity.type === 'strength' ? 'strength' : 'endurance')
    : user.fitnessGoal;
  const reason = activity
    ? `Based on your recent ${activity.type} activity to build ${focus}`
    : `Supports your ${user.fitnessGoal} fitness goal`;
  const workouts = await Workout.find({ focus }).sort({ title: 1, _id: 1 }).lean();
  return workouts.map((workout) => ({ ...workout, reason }));
}

export { User };
