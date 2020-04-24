# NOTE

API need to be preloaded. Add the following cmdline options with directory updated
```
--pre-load-apis="name=computeapi+path=f:\adl\compute_rp"
--pre-load-runtimes="path=f:\adl\arm.adl"
```

# Generate opeapi for api version 2018-06-01
NOTE: 'format' in --config is optional. Defaults to json if not specified. For yaml, set to 'format=yaml'
```
./cairo -a=info generators \
--action=run \
--generator-name=arm.openapi \
--config="apimodel=microsoft.compute,version=2018-06-01,format=yaml"
```

# create an instance of a normalized type

```
./cairo machinery \
--api-name=microsoft.compute \
--action=create-normalized-instance \
--normalized-api-type-name=vmscalesets
```

# create an instance of a versioned type (2018-06-01)

```
./cairo machinery \
--api-name=microsoft.compute \
--action=create-versioned-instance \
--api-version="2018-06-01" \
--versioned-api-type-name="virtualmachinescalesets"
```

# create an instance of a versioned type (2018-10-01)

```
./cairo machinery \
--api-name=microsoft.compute \
--action=create-versioned-instance \
--api-version="2018-10-01" \
--versioned-api-type-name="virtualmachinescalesets"
```

# normalize 2018-06-01

```
./cairo machinery \
--api-name="microsoft.compute" \
--action=normalize \
--api-version="2018-06-01" \
--versioned-api-type-name="virtualmachinescalesets" \
--source=./docs_ex/compute-rp-sample-data/vmscaleset_2018-06-01.json
```

# normalize 2018-10-01
```
./cairo machinery \
--api-name="microsoft.compute" \
--action=normalize \
--api-version="2018-10-01" \
--versioned-api-type-name="virtualmachinescalesets" \
--source=./docs_ex/compute-rp-sample-data/vmscaleset_2018-10-01.json
```

# denormalize 2018-06-01

```
./cairo machinery \
--api-name=microsoft.compute \
--action=denormalize \
--target-api-version=2018-06-01 \
--target-versioned-api-type-name=virtualmachinescalesets \
--source=./docs_ex/compute-rp-sample-data/vmscaleset-normalized.json
```

# denormalize 2018-10-01

```
./cairo machinery \
--api-name=microsoft.compute \
--action=denormalize \
--target-api-version=2018-10-01 \
--target-versioned-api-type-name=virtualmachinescalesets \
--source=./docs_ex/compute-rp-sample-data/vmscaleset-normalized.json
```

# convert

```
./cairo machinery \
--api-name=microsoft.compute \
--action=convert \
--api-version=2018-06-01 \
--versioned-api-type-name=virtualmachinescalesets \
--target-api-version=2018-10-01 \
--target-versioned-api-type-name=virtualmachinescalesets \
--source=./docs_ex/compute-rp-sample-data/vmscaleset_2018-06-01.json
```
