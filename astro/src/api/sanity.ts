import { sanityClient } from 'sanity:client';

export async function getFirstBlogPost() {
  const firstPost = await sanityClient.fetch(`*[_type == "post"][0]`);
  return firstPost;
}

export async function getSiteSettings() {
  const siteSettings = await sanityClient.fetch(
    `*[_type == "siteSettings" && _id == "siteSettings"][0]`
  );
  return siteSettings;
}
