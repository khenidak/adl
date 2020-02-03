# Test Configuration (extended pipeline)

``` yaml
pipeline:
  my0/reset-identity:
    input: swagger-document/loader-swagger
    to: test-document
    name: oai2.loaded.json

  my1/reset-identity:
    input: openapi-document/loader-openapi
    to: test-document
    name: oai3.loaded.json
  
  my5/reset-identity:
    input: openapi-document/multi-api/identity
    to: test-document

  my/emitter:
    input: 
      - my0/reset-identity
      - my1/reset-identity
      - my5/reset-identity
    is-object: true 

output-artifact: test-document
```