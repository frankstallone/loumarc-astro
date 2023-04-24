export const structure = (S, context) =>
  S.list()
    .title('Loumarc Signs Content')
    .items([
      S.listItem()
        .title('Site Settings')
        .child(S.editor().id('siteSettings').schemaType('siteSettings').documentId('siteSettings')),
      ...S.documentTypeListItems().filter(
        (listItem) => !['siteSettings'].includes(listItem.getId())
      ),
    ])
