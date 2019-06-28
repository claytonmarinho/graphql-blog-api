import * as graphqlFields from "graphql-fields";
import { GraphQLResolveInfo } from "graphql";
import { Transaction } from "sequelize";
import { handleError, throwError } from "../../../utils/utils";
import { PostInstance } from "../../../models/PostModel";
import { compose } from "../../composable/composable.resolver";
import { authResolvers } from "../../composable/auth.resolver";
import { AuthUser } from "../../../interfaces/AuthUserInterface";
import { DbConnection } from "../../../interfaces/DbConnectionInterface";
import { DataLoaders } from "../../../interfaces/DataLoadersInterface";
import { RequestedFields } from "../../ast/RequestedFields";

export const postResolvers = {
  Post: {
    author: (
      post,
      args,
      {
        db,
        dataloaders: { userLoader }
      }: { db: DbConnection; dataloaders: DataLoaders },
      info: GraphQLResolveInfo
    ) => {
      return userLoader
        .load({ key: post.get("author"), info })
        .catch(handleError);
    },
    comments: (
      post: PostInstance,
      { first = 10, offset = 0 },
      {
        db,
        requestedFields
      }: { db: DbConnection; requestedFields: RequestedFields },
      info: GraphQLResolveInfo
    ) => {
      return db.Comment.findAll({
        where: {
          post: post.get("id")
        },
        limit: first,
        offset,
        attributes: requestedFields.getFields(info)
      }).catch(handleError);
    }
  },

  Query: {
    posts: (
      parent,
      { first = 10, offset = 0 },
      {
        db,
        requestedFields
      }: { db: DbConnection; requestedFields: RequestedFields },
      info: GraphQLResolveInfo
    ) => {
      return db.Post.findAll({
        limit: first,
        offset,
        attributes: requestedFields.getFields(info, {
          keep: ["id"],
          exclude: ["comments"]
        })
      }).catch(handleError);
    },

    post: (
      parent,
      { id },
      {
        db,
        requestedFields
      }: { db: DbConnection; requestedFields: RequestedFields },
      info: GraphQLResolveInfo
    ) => {
      id = parseInt(id);
      return db.Post.findById(id, {
        attributes: requestedFields.getFields(info, {
          keep: ["id"],
          exclude: ["comments"]
        })
      })
        .then((post: PostInstance) => {
          throwError(!post, `Post with id ${id} not found!`);

          return post;
        })
        .catch(handleError);
    }
  },

  Mutation: {
    createPost: compose(...authResolvers)(
      (
        parent,
        { input },
        { db, authUser }: { db: DbConnection; authUser: AuthUser },
        info: GraphQLResolveInfo
      ) => {
        input.author = authUser.id;

        return db.sequelize
          .transaction((t: Transaction) => {
            return db.Post.create(input, { transaction: t });
          })
          .catch(handleError);
      }
    ),

    updatePost: compose(...authResolvers)(
      (
        parent,
        { id, input },
        { db, authUser }: { db: DbConnection; authUser: AuthUser },
        info: GraphQLResolveInfo
      ) => {
        id = parseInt(id);
        return db.sequelize
          .transaction((t: Transaction) => {
            return db.Post.findById(id).then((post: PostInstance) => {
              throwError(!post, `Post with id ${id} not found!`);
              throwError(
                post.get("author") != authUser.id,
                `Unauthorized! You can only update your own posts`
              );
              input.author = authUser.id;

              return post.update(input, { transaction: t });
            });
          })
          .catch(handleError);
      }
    ),

    deletePost: compose(...authResolvers)(
      (
        parent,
        { id },
        { db, authUser }: { db: DbConnection; authUser: AuthUser },
        info: GraphQLResolveInfo
      ) => {
        id = parseInt(id);
        return db.sequelize
          .transaction((t: Transaction) => {
            return db.Post.findById(id).then((post: PostInstance) => {
              throwError(!post, `Post with id ${id} not found!`);
              throwError(
                post.get("author") != authUser.id,
                `Unauthorized! You can only remove your own posts`
              );
              return post
                .destroy({ transaction: t })
                .then((post: any) => !!post);
            });
          })
          .catch(handleError);
      }
    )
  }
};
