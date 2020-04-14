#What is this?

This is a representation of apis used by the system using adl language. It allows for:

1. Snapping an apis spec to a specific version of adl error/error list versions
2. Snapping tools that deals with the object models (which represents ast) to snap to a public stable version, rather than the internal version that can change

#What does it contain?

- adl: representing adl error, errors list etc..
- model: representing the models.

#How does it work?

- the entire directory is excluded from `adl.runtime` compilation
- the apis are added to machinery and runtime during model parsing or where applicable
