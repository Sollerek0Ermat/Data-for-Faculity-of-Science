class api_feachers {
    constructor(queryStrigified) {
        // no queryObject needed anymore - Prisma doesn't have a "live query" to mutate,
        // we build one args object instead
        this.queryStrigified = queryStrigified;
        this.args = {
            where: {},
        };
    }


    // filter by gte gt lte lt ne
    filter() {
        const params_query = this.queryStrigified; //127.0.0.1:3000/v1/movies/?rating[lte]=4&duration[lte]=120
        const prismaWhere = {};

        for (const key in params_query) {
            if (key === 'sort' || key === 'fields' || key === 'page' || key === 'limit') continue;

            const match = key.match(/^(.+)\[(gte|gt|lte|lt|not)\]$/); // gte/gt/lte/lt/not

            if (match) {
                // const field = match[1];
                // const operator = match[2];
                // const prismaOp = operator === 'ne' ? 'not' : operator; // Prisma uses "not" instead of "ne"
                prismaWhere[match[1]] = { ...(prismaWhere[match[1]]), [`${match[2]}`]: Number(params_query[key]) };

                // prismaWhere[field] = {
                //     ...(prismaWhere[field] || {}),
                //     [`$${prismaOp}`]: Number(params_query[key]),
                // };
            } else {
                prismaWhere[key] = params_query[key];
                // = isNaN(params_query[key])
                //     ? params_query[key]
                //     : Number(params_query[key]);
            }
        }

        this.args.where = prismaWhere;
        // this.query = this.query.find(prismaWhere);

        return this;
    }

    // sort by asc // sort by desc(-)
    sort() {
        if (this.queryStrigified.sort) { //127.0.0.1:3000/v1/movies/?sort=-rating,duration
            const sort_split = this.queryStrigified.sort.split(',');

            this.args.orderBy = sort_split.map(field => {
                if (field.startsWith('-')) {
                    // Descending: -rating → { rating: 'desc' }
                    return { [field.substring(1)]: 'desc' };
                } else {
                    // Ascending: rating → { rating: 'asc' }
                    return { [field]: 'asc' };
                }
            });
        }
        return this;
    }

    // limiting fields (include only these in the response) - Prisma has no "exclude" syntax like Mongo's -__v
    limiting() {
        if (this.queryStrigified.fields) {
            const rawFields = this.queryStrigified.fields.split(',');

            const include = {};
            const omit = {};

            rawFields.forEach(f => {
                if (f.startsWith('-')) {
                    omit[f.substring(1)] = true;
                } else {
                    include[f] = true;
                }
            });

            this.args.select = Object.keys(include).length ? include : undefined;
            this.args.omit = Object.keys(omit).length ? omit : undefined;
        }
        return this;
    }

    // page number and limit of documents in 1 page
    pagination() {
        const page = +this.queryStrigified.page || 1;
        const limit = +this.queryStrigified.limit || 10;
        const skip = (page - 1) * limit;

        this.args.skip = skip;
        this.args.take = limit;

        return this;
    }
}

module.exports = api_feachers;