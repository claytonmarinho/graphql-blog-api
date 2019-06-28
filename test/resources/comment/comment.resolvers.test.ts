import * as jwt from "jsonwebtoken";
import { app, db, chai, handleError, expect } from "./../../test-utils";
import { UserInstance } from "../../../src/models/UserModel";
import { JWT_SECRET } from "../../../src/utils/utils";
import { CommentInstance } from "../../../src/models/CommentModel";
import { PostInstance } from "../../../src/models/PostModel";

const seedUsers = [
  {
    name: "Jason Quill",
    email: "jason@guardians.com",
    password: "1234"
  }
];

const getSeedPosts = author => [
  {
    title: "First Post",
    content: "first post content",
    author,
    photo: "some_photo"
  }
];

const getSeedComments = (user, post) => [
  {
    comment: "first comment",
    user,
    post
  },
  {
    comment: "second comment",
    user,
    post
  },
  {
    comment: "third comment",
    user,
    post
  }
];

describe("Comment", () => {
  let token: string;
  let userId: number;
  let commentId: number;
  let postId: number;

  let seedComments: any[];
  let seedPost: any;

  beforeEach(() => {
    return db.Comment.destroy({ where: {} })
      .then((rows: number) => db.Post.destroy({ where: {} }))
      .then((rows: number) => db.User.destroy({ where: {} }))
      .then((rows: number) =>
        db.User.create(seedUsers[0])
          .then((user: UserInstance) => {
            userId = user.get("id");
            const payload = {
              sub: userId
            };
            token = jwt.sign(payload, JWT_SECRET);

            seedPost = getSeedPosts(userId)[0];

            return db.Post.create(seedPost);
          })
          .then((post: PostInstance) => {
            postId = post.get("id");

            seedComments = getSeedComments(userId, postId);
            return db.Comment.bulkCreate(seedComments);
          })
          .then((comments: CommentInstance[]) => {
            commentId = comments[0].get("id");
          })
      );
  });

  describe("Queries", () => {
    describe("application/json", () => {
      describe("commentsByPost", () => {
        it("should return a list of Comments", () => {
          let body = {
            query: `
              query getCommentsByPostList($postId: ID!, $first: Int, $offset: Int) {
                commentsByPost(postId: $postId, first: $first, offset: $offset) {
                  comment
                  user {
                    id
                  }
                  post {
                    id
                  }
                }
              }
            `,
            variables: {
              postId
            }
          };

          return chai
            .request(app)
            .post("/graphql")
            .set("content-type", "application/json")
            .send(JSON.stringify(body))
            .then(res => {
              const commentsList = res.body.data.commentsByPost;
              expect(res.body.data).to.be.an("object");
              expect(commentsList).to.be.an("array");
              expect(commentsList[0]).to.not.have.keys([
                "id",
                "createdAt",
                "updatedAt"
              ]);
              expect(commentsList[0]).to.have.keys(["comment", "user", "post"]);
              expect(parseInt(commentsList[0].user.id)).to.equal(userId);
              expect(parseInt(commentsList[0].post.id)).to.equal(postId);
            })
            .catch(handleError);
        });
      });
    });
  });

  describe("Mutations", () => {
    describe("application/json", () => {
      describe("createComment", () => {
        it("should create new Comment", () => {
          const newCommentData = {
            comment: "New comment",
            post: postId
          };

          let body = {
            query: `
              mutation createNewComment($input: CommentInput!) {
                createComment(input: $input) {
                  comment
                  user {
                    id
                    name
                  }
                  post {
                    id
                    title
                  }
                }
              }
            `,
            variables: {
              input: newCommentData
            }
          };
          return chai
            .request(app)
            .post("/graphql")
            .set("content-type", "application/json")
            .set("authorization", `Bearer ${token}`)
            .send(JSON.stringify(body))
            .then(res => {
              const createdComment = res.body.data.createComment;

              expect(res.body.data).to.be.an("object");
              expect(res.body.data).to.have.key("createComment");
              expect(createdComment).to.be.an("object");
              expect(createdComment).to.have.keys(["comment", "user", "post"]);

              expect(createdComment.comment).to.equal(newCommentData.comment);
              expect(parseInt(createdComment.user.id)).to.be.equal(userId);
              expect(createdComment.user.name).to.be.equal(seedUsers[0].name);
              expect(parseInt(createdComment.post.id)).to.be.equal(postId);
              expect(createdComment.post.title).to.be.equal(seedPost.title);
            })
            .catch(handleError);
        });
      });

      describe("updateComment", () => {
        it("should update an existing Comment", () => {
          const commentUpdateInput = {
            comment: "First comment changed",
            post: postId
          };

          let body = {
            query: `
              mutation updateExistingComment($id: ID!, $input: CommentInput!) {
                updateComment(id: $id, input: $input) {
                  id
                  comment
                }
              }
            `,
            variables: {
              id: commentId,
              input: commentUpdateInput
            }
          };
          return chai
            .request(app)
            .post("/graphql")
            .set("content-type", "application/json")
            .set("authorization", `Bearer ${token}`)
            .send(JSON.stringify(body))
            .then(res => {
              const updatedComment = res.body.data.updateComment;
              expect(res.body.data).to.be.an("object");
              expect(res.body.data).to.have.key("updateComment");
              expect(updatedComment).to.be.an("object");
              expect(updatedComment).to.have.keys(["id", "comment"]);
              expect(updatedComment.comment).to.equal(
                commentUpdateInput.comment
              );
            })
            .catch(handleError);
        });
      });

      describe("deleteComment", () => {
        it("should delete an an existing Comment", () => {
          let body = {
            query: `
              mutation deleteExistingComment($id: ID!) {
                deleteComment(id: $id)
              }
            `,
            variables: {
              id: commentId
            }
          };
          return chai
            .request(app)
            .post("/graphql")
            .set("content-type", "application/json")
            .set("authorization", `Bearer ${token}`)
            .send(JSON.stringify(body))
            .then(res => {
              const deleteComment = res.body.data.deleteComment;
              expect(res.body.data).to.be.an("object");
              expect(res.body.data).to.have.key("deleteComment");
              expect(deleteComment).to.be.true;
            })
            .catch(handleError);
        });
      });
    });
  });
});
