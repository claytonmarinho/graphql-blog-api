import { GraphQLResolveInfo } from "graphql";
import { Transaction } from "sequelize";

import { authResolvers } from "../../composable/auth.resolver";
import { AuthUser } from "../../../interfaces/AuthUserInterface";
import { DbConnection } from "../../../interfaces/DbConnectionInterface";
import { UserInstance } from "../../../models/UserModel";
import { handleError, throwError } from "../../../utils/utils";
import { compose } from "../../composable/composable.resolver";
import { RequestedFields } from "../../ast/RequestedFields";

export const userResolvers = {
  User: {
    posts: (
      user: UserInstance,
      { first = 10, offset = 0 },
      {
        db,
        requestedFields
      }: { db: DbConnection; requestedFields: RequestedFields },
      info: GraphQLResolveInfo
    ) => {
      return db.Post.findAll({
        where: {
          author: user.get("id")
        },
        limit: first,
        offset,
        attributes: requestedFields.getFields(info, {
          keep: ["id"],
          exclude: ["comments"]
        })
      }).catch(handleError);
    }
  },

  Query: {
    users: (
      parent,
      { first = 10, offset = 0 },
      {
        db,
        requestedFields
      }: { db: DbConnection; requestedFields: RequestedFields },
      info: GraphQLResolveInfo
    ) => {
      return db.User.findAll({
        limit: first,
        offset,
        attributes: requestedFields.getFields(info, {
          keep: ["id"],
          exclude: ["posts"]
        })
      }).catch(handleError);
    },

    user: (
      parent,
      { id },
      {
        db,
        requestedFields
      }: { db: DbConnection; requestedFields: RequestedFields },
      info: GraphQLResolveInfo
    ) => {
      id = parseInt(id);
      return db.User.findById(id, {
        attributes: requestedFields.getFields(info, {
          keep: ["id"],
          exclude: ["posts"]
        })
      })
        .then((user: UserInstance) => {
          throwError(!user, `User with id ${id} not found!`);
          return user;
        })
        .catch(handleError);
    },

    currentUser: compose(...authResolvers)(
      (
        parent,
        args,
        {
          db,
          authUser,
          requestedFields
        }: {
          db: DbConnection;
          authUser: AuthUser;
          requestedFields: RequestedFields;
        },
        info: GraphQLResolveInfo
      ) => {
        return db.User.findById(authUser.id, {
          attributes: requestedFields.getFields(info, {
            keep: ["id"],
            exclude: ["posts"]
          })
        }).then((user: UserInstance) => {
          throwError(!user, `User with id ${authUser.id} not found!`);
          return user;
        });
      }
    )
  },

  Mutation: {
    createUser: (
      parent,
      { input },
      { db }: { db: DbConnection },
      info: GraphQLResolveInfo
    ) => {
      return db.sequelize
        .transaction((t: Transaction) => {
          return db.User.create(input, { transaction: t });
        })
        .catch(handleError);
    },

    updateUser: compose(...authResolvers)(
      (
        parent,
        { input },
        { db, authUser }: { db: DbConnection; authUser: AuthUser },
        info: GraphQLResolveInfo
      ) => {
        return db.sequelize
          .transaction((t: Transaction) => {
            return db.User.findById(authUser.id).then((user: UserInstance) => {
              throwError(!user, `User with id ${authUser.id} not found!`);
              return user.update(input, { transaction: t });
            });
          })
          .catch(handleError);
      }
    ),

    updateUserPassword: compose(...authResolvers)(
      (
        parent,
        { input },
        { db, authUser }: { db: DbConnection; authUser: AuthUser },
        info: GraphQLResolveInfo
      ) => {
        return db.sequelize
          .transaction((t: Transaction) => {
            return db.User.findById(authUser.id).then((user: UserInstance) => {
              throwError(!user, `User with id ${authUser.id} not found!`);
              return user
                .update(input, { transaction: t })
                .then((user: UserInstance) => !!user);
            });
          })
          .catch(handleError);
      }
    ),

    deleteUser: compose(...authResolvers)(
      (
        parent,
        args,
        { db, authUser }: { db: DbConnection; authUser: AuthUser },
        info: GraphQLResolveInfo
      ) => {
        return db.sequelize
          .transaction((t: Transaction) => {
            return db.User.findById(authUser.id).then((user: UserInstance) => {
              throwError(!user, `User with id ${authUser.id} not found!`);
              return user
                .destroy({ transaction: t })
                .then((user: any) => !!user);
            });
          })
          .catch(handleError);
      }
    )
  }
};
