import mongoose, { Schema, Document } from 'mongoose';

export interface IChannelPreference {
  email: boolean;
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
}

export interface IUserPreference extends Document {
  userId: string;
  preferences: Map<string, IChannelPreference>;
  globalMute: boolean;
  dndMode: {
    enabled: boolean;
    startHour: number; // 0-23
    endHour: number;   // 0-23
  };
}

const ChannelPreferenceSchema = new Schema({
  email: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  push: { type: Boolean, default: true },
  whatsapp: { type: Boolean, default: false },
}, { _id: false });

const UserPreferenceSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    preferences: {
      type: Map,
      of: ChannelPreferenceSchema,
      default: {},
    },
    globalMute: {
      type: Boolean,
      default: false,
    },
    dndMode: {
      enabled: { type: Boolean, default: false },
      startHour: { type: Number, default: 22 },
      endHour: { type: Number, default: 7 },
    },
  },
  { timestamps: true }
);

export const UserPreference = mongoose.model<IUserPreference>('UserPreference', UserPreferenceSchema);
