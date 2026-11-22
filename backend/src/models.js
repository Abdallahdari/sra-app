import mongoose from 'mongoose';
import { TYPE_NAMES } from './types.js';

const { Schema, model } = mongoose;

export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

const ContentSchema = new Schema(
  {
    type: { type: String, enum: TYPE_NAMES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 400 },
    slug: { type: String, required: true },
    summary: { type: String, default: '', maxlength: 4000 },
    body: { type: String, default: '', maxlength: 100_000 },
    image: { type: String, default: '' },
    gallery: { type: [String], default: [] },
    date: { type: Date, default: () => new Date() },
    category: { type: String, default: '' },
    link: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    meta: { type: Schema.Types.Mixed, default: {} },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    source: { type: String, enum: ['wp', 'admin'], default: 'admin' },
    wpKey: { type: String }, // stable key for re-imports from sra.so
  },
  { timestamps: true, minimize: false },
);

ContentSchema.index({ type: 1, published: 1, order: 1, date: -1 });
ContentSchema.index({ type: 1, slug: 1 }, { unique: true });
ContentSchema.index({ wpKey: 1 }, { unique: true, sparse: true });
ContentSchema.index({ title: 'text', summary: 'text', category: 'text' });

ContentSchema.pre('validate', async function ensureSlug() {
  if (!this.slug) this.slug = slugify(this.title) || String(this._id);
  if (this.isModified('slug') || this.isNew) {
    // keep slugs unique within a type
    const base = this.slug;
    let n = 1;
    while (await this.constructor.exists({ type: this.type, slug: this.slug, _id: { $ne: this._id } })) {
      this.slug = `${base}-${++n}`;
    }
  }
});

export const Content = model('Content', ContentSchema);

const SettingsSchema = new Schema(
  {
    _id: { type: String, default: 'site' },
    hero: {
      title: String,
      subtitle: String,
      image: String,
    },
    stats: [{ value: String, label: String }],
    regions: [String],
    contact: {
      address: String,
      phones: [String],
      email: String,
      website: String,
    },
    social: {
      facebook: String,
      x: String,
      linkedin: String,
      youtube: String,
    },
    about: { type: String, default: '' },
    announcement: { type: String, default: '' },
  },
  { timestamps: true, minimize: false },
);
export const Settings = model('Settings', SettingsSchema);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: 'Admin' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'editor'], default: 'admin' },
    lastLoginAt: Date,
  },
  { timestamps: true },
);
export const User = model('User', UserSchema);
